import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as dagre from "@dagrejs/dagre";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type NodeProps,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { GraphData, GraphNode, NodeCategory } from "./types.ts";

const CATEGORY_COLOR: Record<NodeCategory, string> = {
  page:       "#8B5CF6",
  api:        "#F59E0B",
  layout:     "#3B82F6",
  component:  "#10B981",
  hook:       "#06B6D4",
  store:      "#EAB308",
  util:       "#64748B",
  type:       "#7C3AED",
  config:     "#EC4899",
  middleware: "#22C55E",
  test:       "#F97316",
  model:      "#0EA5E9",
  controller: "#D946EF",
  service:    "#14B8A6",
  view:       "#A78BFA",
  template:   "#FB923C",
  migration:  "#6366F1",
  script:     "#84CC16",
  other:      "#71717A",
};

const CATEGORY_LABEL: Record<NodeCategory, string> = {
  page:       "Page",
  api:        "API",
  layout:     "Layout",
  component:  "Component",
  hook:       "Hook",
  store:      "Store",
  util:       "Utility",
  type:       "Types",
  config:     "Config",
  middleware: "Middleware",
  test:       "Test",
  model:      "Model",
  controller: "Controller",
  service:    "Service",
  view:       "View",
  template:   "Template",
  migration:  "Migration",
  script:     "Script",
  other:      "Other",
};

export { CATEGORY_COLOR, CATEGORY_LABEL };

const FONT_SANS = "'Geist', system-ui, -apple-system, sans-serif";
const FONT_MONO = "'Geist Mono', 'SF Mono', Menlo, monospace";

const NODE_WIDTH  = 210;
const NODE_HEIGHT = 58;

const STATUS_COLOR: Record<string, string> = {
  entry: "#22C55E",
  live:  "#3B82F6",
  dead:  "#EF4444",
};

// Category order — determines cluster grid sequence
const CATEGORY_ORDER: NodeCategory[] = [
  "page", "layout", "api", "controller", "component", "hook",
  "store", "model", "service", "view", "template",
  "util", "type", "config", "middleware", "migration", "script", "test", "other",
];

// Cluster grid constants
const CLUSTER_COLS   = 3;
const CLUSTER_GAP_X  = 56;
const CLUSTER_GAP_Y  = 56;
const CLUSTER_PAD_X  = 24;
const CLUSTER_PAD_Y  = 20;
const CLUSTER_LABEL_H = 30; // room for category label above nodes

// ─── Cluster layout ───────────────────────────────────────────────────────────

interface GroupNodeData {
  color: string;
  label: string;
  count: number;
  [key: string]: unknown;
}

function getLayoutedNodes(
  graphNodes: GraphNode[],
  graphEdges: { id: string; source: string; target: string }[],
  onHover: (id: string | null) => void,
  hoveredId: string | null
): Node[] {
  // Group by category in canonical order
  const grouped = new Map<NodeCategory, GraphNode[]>();
  for (const cat of CATEGORY_ORDER) grouped.set(cat, []);
  for (const n of graphNodes) {
    (grouped.get(n.category) ?? grouped.get("other")!).push(n);
  }

  const all: Node[] = [];
  let col   = 0;
  let rowX  = 0;
  let rowY  = 0;
  let maxH  = 0;

  for (const [category, nodes] of grouped) {
    if (nodes.length === 0) continue;

    const color    = CATEGORY_COLOR[category];
    const label    = CATEGORY_LABEL[category];
    const nodeIds  = new Set(nodes.map((n) => n.id));
    const intraEdges = graphEdges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    // Dagre for this cluster only
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: "TB", ranksep: 28, nodesep: 16, marginx: 0, marginy: 0 });
    for (const n of nodes) g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    for (const e of intraEdges) {
      if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target);
    }
    dagre.layout(g);

    const gi      = g.graph();
    const innerW  = Math.max(gi.width ?? NODE_WIDTH, NODE_WIDTH);
    const innerH  = gi.height ?? NODE_HEIGHT;
    const groupW  = innerW + CLUSTER_PAD_X * 2;
    const groupH  = innerH + CLUSTER_PAD_Y * 2 + CLUSTER_LABEL_H;

    // Advance row
    if (col >= CLUSTER_COLS) {
      rowX = 0;
      rowY += maxH + CLUSTER_GAP_Y;
      maxH = 0;
      col  = 0;
    }

    const gx = rowX;
    const gy = rowY;

    // Background group node (rendered below code nodes via zIndex)
    all.push({
      id:       `__group__${category}`,
      type:     "groupNode",
      position: { x: gx, y: gy },
      zIndex:   -1,
      data:     { color, label, count: nodes.length } as GroupNodeData & Record<string, unknown>,
      style:    { width: groupW, height: groupH },
      draggable:  false,
      selectable: false,
      focusable:  false,
    } as Node);

    // Code nodes at absolute positions within the cluster grid
    for (const n of nodes) {
      const pos = g.node(n.id);
      all.push({
        id:       n.id,
        type:     "codeNode",
        position: {
          x: gx + CLUSTER_PAD_X + (pos ? pos.x - NODE_WIDTH / 2  : 0),
          y: gy + CLUSTER_LABEL_H + CLUSTER_PAD_Y + (pos ? pos.y - NODE_HEIGHT / 2 : 0),
        },
        data: {
          label:          n.label,
          raw:            n,
          onHover,
          hoveredId,
          highlightedIds: null,
          isDark:         true,
        } as CodeNodeData & Record<string, unknown>,
      } as Node);
    }

    rowX += groupW + CLUSTER_GAP_X;
    maxH  = Math.max(maxH, groupH);
    col++;
  }

  return all;
}

// ─── Group node component ─────────────────────────────────────────────────────

function GroupNode({ data }: NodeProps<Node<GroupNodeData>>) {
  const d = data as GroupNodeData;
  return (
    <div
      style={{
        width:        "100%",
        height:       "100%",
        borderRadius: 12,
        border:       `1px solid ${d.color}25`,
        background:   `${d.color}10`,
        pointerEvents: "none",
        position:     "relative",
      }}
    >
      <div
        style={{
          position:      "absolute",
          top:           10,
          left:          14,
          display:       "flex",
          alignItems:    "center",
          gap:           6,
          fontSize:      9,
          fontWeight:    700,
          letterSpacing: "0.1em",
          textTransform: "uppercase" as const,
          color:         d.color,
          fontFamily:    FONT_SANS,
          opacity:       0.9,
        }}
      >
        <span
          style={{
            width:       5,
            height:      5,
            borderRadius: "50%",
            background:  d.color,
            display:     "inline-block",
            boxShadow:   `0 0 5px ${d.color}55`,
            flexShrink:  0,
          }}
        />
        {d.label}
        <span style={{ opacity: 0.6, fontWeight: 500 }}>{d.count}</span>
      </div>
    </div>
  );
}

// ─── Code node component ──────────────────────────────────────────────────────

interface CodeNodeData {
  label:          string;
  raw:            GraphNode;
  onHover:        (id: string | null) => void;
  hoveredId:      string | null;
  highlightedIds: Set<string> | null;
  isDark:         boolean;
  [key: string]:  unknown;
}

function CodeNode({ data }: NodeProps<Node<CodeNodeData>>) {
  const node      = data.raw;
  const dark      = data.isDark !== false; // default dark
  const color     = STATUS_COLOR[node.status] ?? "#2a2a2a";
  const isHovered = data.hoveredId === node.id;
  const isDimmed  = data.highlightedIds !== null && !data.highlightedIds.has(node.id);

  return (
    <div
      onMouseEnter={() => data.onHover(node.id)}
      onMouseLeave={() => data.onHover(null)}
      style={{
        position:      "relative",
        fontFamily:    FONT_SANS,
        opacity:       isDimmed ? 0.08 : 1,
        transition:    "opacity 0.2s ease",
        pointerEvents: isDimmed ? "none" : "auto",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: dark ? "#3D3935" : "#D4CFC8", border: "none", width: 6, height: 6 }}
      />

      {/* Node card */}
      <div
        style={{
          background:   dark ? "rgba(28, 26, 24, 0.97)" : "rgba(255, 255, 255, 0.97)",
          border:       `1.5px solid ${isHovered ? color : `${color}45`}`,
          borderRadius: 8,
          padding:      "9px 13px 9px 12px",
          minWidth:     NODE_WIDTH,
          maxWidth:     NODE_WIDTH,
          cursor:       "pointer",
          transition:   "border-color 0.15s ease, box-shadow 0.15s ease",
          boxShadow:    isHovered
            ? `0 0 0 2px ${color}15, 0 6px 20px ${dark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.15)"}`
            : `0 1px 3px ${dark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.08)"}`,
          position:     "relative",
        }}
      >
        {/* Status dot */}
        <div
          style={{
            position:     "absolute",
            top:          9,
            right:        10,
            width:        6,
            height:       6,
            borderRadius: "50%",
            background:   color,
            boxShadow:    isHovered ? `0 0 8px ${color}70` : `0 0 4px ${color}40`,
            transition:   "box-shadow 0.15s ease",
          }}
        />

        {/* Filename */}
        <div
          style={{
            fontFamily:   FONT_MONO,
            fontSize:     12,
            fontWeight:   500,
            color:        dark ? "#e8e8e8" : "#1a1a1a",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
            maxWidth:     168,
            paddingRight: 14,
            lineHeight:   "17px",
          }}
        >
          {node.label}
        </div>

        {/* Category + lines row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
          <span
            style={{
              fontSize:      9,
              fontWeight:    600,
              letterSpacing: "0.04em",
              textTransform: "uppercase" as const,
              color:         CATEGORY_COLOR[node.category] ?? "#52525b",
              background:    `${CATEGORY_COLOR[node.category] ?? "#52525b"}18`,
              border:        `1px solid ${CATEGORY_COLOR[node.category] ?? "#52525b"}30`,
              borderRadius:  3,
              padding:       "1px 5px",
              lineHeight:    "14px",
              flexShrink:    0,
            }}
          >
            {CATEGORY_LABEL[node.category] ?? node.category}
          </span>
          <span style={{ fontSize: 10, color: dark ? "#787068" : "#8A8480", lineHeight: "14px", fontFamily: FONT_SANS }}>
            {node.loc.toLocaleString()} lines
          </span>
        </div>
      </div>

      {/* Hover tooltip */}
      {isHovered && (
        <div
          style={{
            position:      "absolute",
            top:           "calc(100% + 8px)",
            left:          "50%",
            transform:     "translateX(-50%)",
            background:    dark ? "rgba(28, 26, 24, 0.98)" : "rgba(255,255,255,0.98)",
            border:        `1px solid ${dark ? "#3D3935" : "#E0DCD6"}`,
            borderRadius:  7,
            padding:       "9px 12px",
            zIndex:        100,
            width:         260,
            boxShadow:     dark ? "0 8px 32px rgba(0,0,0,0.6)" : "0 8px 32px rgba(0,0,0,0.12)",
            pointerEvents: "none" as const,
          }}
        >
          <div
            style={{
              fontSize:      12,
              color:         dark ? "#e8e8e8" : "#1a1a1a",
              fontWeight:    500,
              lineHeight:    "17px",
              fontFamily:    FONT_SANS,
              letterSpacing: "-0.01em",
            }}
          >
            {node.description}
          </div>
          <div
            style={{
              fontSize:   10,
              color:      dark ? "#787068" : "#888",
              fontFamily: FONT_MONO,
              marginTop:  5,
              lineHeight: "14px",
              wordBreak:  "break-all" as const,
            }}
          >
            {node.path}
          </div>
          {node.deadExports.length > 0 && (
            <div
              style={{
                marginTop:  7,
                fontSize:   10,
                color:      "#ef4444",
                fontFamily: FONT_SANS,
                display:    "flex",
                alignItems: "center",
                gap:        5,
              }}
            >
              <span style={{ fontSize: 9 }}>⚠</span>
              {node.deadExports.length} unused export{node.deadExports.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: dark ? "#3D3935" : "#D4CFC8", border: "none", width: 6, height: 6 }}
      />
    </div>
  );
}

const nodeTypes = { codeNode: CodeNode, groupNode: GroupNode };

// ─── Edge helpers ─────────────────────────────────────────────────────────────

function toFlowEdges(
  graphEdges: { id: string; source: string; target: string }[]
): Edge[] {
  return graphEdges.map((e) => ({
    id:     e.id,
    source: e.source,
    target: e.target,
    style:  { stroke: "#3D3935", strokeWidth: 1 },
    markerEnd: {
      type:   MarkerType.ArrowClosed,
      color:  "#3D3935",
      width:  14,
      height: 10,
    },
  }));
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  graph:          GraphData;
  onSelect:       (node: GraphNode | null) => void;
  activeCategory: NodeCategory | null;
  searchQuery:    string;
  isDark:         boolean;
}

// Inner component — must live inside <ReactFlow> to access useReactFlow
function GraphInner({
  graph,
  onSelect,
  activeCategory,
  searchQuery,
  isDark,
}: Props) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const onHover = useCallback((id: string | null) => setHoveredId(id), []);

  const initialNodes = useMemo(
    () => getLayoutedNodes(graph.nodes, graph.edges, onHover, hoveredId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph.nodes, graph.edges]
  );
  const initialEdges = useMemo(() => toFlowEdges(graph.edges), [graph.edges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, ,  onEdgesChange] = useEdgesState(initialEdges);

  // Compute which node IDs should be highlighted (null = all highlighted)
  const highlightedIds = useMemo<Set<string> | null>(() => {
    const hasCategory = activeCategory !== null;
    const hasSearch   = searchQuery.trim().length > 0;
    if (!hasCategory && !hasSearch) return null;
    const q = searchQuery.toLowerCase().trim();
    return new Set(
      graph.nodes
        .filter((n) => {
          const okCat    = !hasCategory || n.category === activeCategory;
          const okSearch = !hasSearch   ||
            n.label.toLowerCase().includes(q) ||
            n.path.toLowerCase().includes(q);
          return okCat && okSearch;
        })
        .map((n) => n.id)
    );
  }, [graph.nodes, activeCategory, searchQuery]);

  // Track previous highlightedIds to detect filter clear
  const prevHighlightedRef = useRef<Set<string> | null | undefined>(undefined);

  // Auto-fit when filter/search changes
  useEffect(() => {
    const prev = prevHighlightedRef.current;
    prevHighlightedRef.current = highlightedIds;

    const timer = setTimeout(() => {
      if (highlightedIds === null) {
        // Filter was cleared — recenter to show all nodes
        if (prev !== undefined && prev !== null) {
          fitView({ duration: 450, padding: 0.1 });
        }
        return;
      }
      const matchingNodeIds = [...highlightedIds];
      if (matchingNodeIds.length === 0) return;
      fitView({
        nodes: matchingNodeIds.map((id) => ({ id })),
        duration: 450,
        padding: 0.18,
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [highlightedIds, fitView]);

  // Inject reactive data into code nodes only
  const displayNodes = useMemo(
    () =>
      nodes.map((n) => {
        if (n.type !== "codeNode") return n;
        return { ...n, data: { ...n.data, hoveredId, onHover, highlightedIds, isDark } };
      }),
    [nodes, hoveredId, onHover, highlightedIds, isDark]
  );

  // Dim edges whose endpoints are both outside the highlight set
  const displayEdges = useMemo(
    () =>
      edges.map((e) => {
        const dimmed =
          highlightedIds !== null &&
          !highlightedIds.has(e.source) &&
          !highlightedIds.has(e.target);
        const edgeColor = dimmed
          ? (isDark ? "#1c1c1c" : "#ececec")
          : (isDark ? "#3D3935" : "#D4CFC8");
        return {
          ...e,
          style:     { stroke: edgeColor, strokeWidth: 1 },
          markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor, width: 14, height: 10 },
        };
      }),
    [edges, highlightedIds, isDark]
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === "groupNode") return;
      const raw = (node.data as CodeNodeData).raw;
      onSelect(raw);
    },
    [onSelect]
  );

  const onPaneClick = useCallback(() => onSelect(null), [onSelect]);

  void setNodes;

  return (
    <ReactFlow
      nodes={displayNodes}
      edges={displayEdges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      fitView
      fitViewOptions={{ padding: 0.1 }}
      minZoom={0.04}
      maxZoom={2}
      colorMode={isDark ? "dark" : "light"}
      proOptions={{ hideAttribution: true }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        color={isDark ? "#2D2A27" : "#E8E4DE"}
        size={1}
        style={{ background: isDark ? "#1C1917" : "#F8F7F4" }}
      />

      {/* Zoom + recenter controls above minimap */}
      {/* Zoom + recenter controls — horizontal row, same width as MiniMap (200px) */}
      <Panel position="bottom-right" style={{ marginBottom: 166 }}>
        <div
          style={{
            display:        "flex",
            flexDirection:  "row",
            width:          200,
            background:     isDark ? "rgba(28,26,24,0.92)" : "rgba(255,255,255,0.92)",
            backdropFilter: "blur(12px)",
            border:         `1px solid ${isDark ? "#3D3935" : "#E0DCD6"}`,
            borderRadius:   8,
            overflow:       "hidden",
          }}
        >
          {[
            {
              title: "Zoom out",
              onClick: () => zoomOut({ duration: 200 }),
              icon: (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ),
            },
            {
              title: "Fit to view",
              onClick: () => fitView({ duration: 400, padding: 0.1 }),
              icon: (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 4V1.5A.5.5 0 011.5 1H4M8 1h2.5a.5.5 0 01.5.5V4M11 8v2.5a.5.5 0 01-.5.5H8M4 11H1.5a.5.5 0 01-.5-.5V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              ),
            },
            {
              title: "Zoom in",
              onClick: () => zoomIn({ duration: 200 }),
              icon: (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ),
            },
          ].map((btn, i, arr) => (
            <button
              key={btn.title}
              title={btn.title}
              onClick={btn.onClick}
              style={{
                flex:           1,
                background:     "none",
                border:         "none",
                borderRight:    i < arr.length - 1 ? `1px solid ${isDark ? "#3D3935" : "#E0DCD6"}` : "none",
                padding:        "7px 0",
                cursor:         "pointer",
                color:          isDark ? "#888" : "#666",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                transition:     "color 0.15s ease, background 0.15s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color      = isDark ? "#f0f0f0" : "#1a1a1a";
                (e.currentTarget as HTMLButtonElement).style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color      = isDark ? "#888" : "#666";
                (e.currentTarget as HTMLButtonElement).style.background = "none";
              }}
            >
              {btn.icon}
            </button>
          ))}
        </div>
      </Panel>

      <MiniMap
        style={{
          background:   isDark ? "rgba(28,26,24,0.92)" : "rgba(255,255,255,0.92)",
          border:       `1px solid ${isDark ? "#3D3935" : "#E0DCD6"}`,
          borderRadius: 8,
          overflow:     "hidden",
        }}
        maskColor={isDark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.6)"}
        nodeColor={(n) =>
          n.type === "groupNode"
            ? "transparent"
            : STATUS_COLOR[(n.data as CodeNodeData).raw?.status] ?? "#2a2a2a"
        }
        pannable
        zoomable
      />
    </ReactFlow>
  );
}

// Outer wrapper provides ReactFlowProvider context so GraphInner can use useReactFlow
export function CodeGraph(props: Props) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  );
}
