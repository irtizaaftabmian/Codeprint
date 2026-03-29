import { useCallback, useMemo, useState } from "react";
import * as dagre from "@dagrejs/dagre";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
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
  page:       "#a78bfa",
  api:        "#fb923c",
  layout:     "#60a5fa",
  component:  "#34d399",
  hook:       "#22d3ee",
  store:      "#fbbf24",
  util:       "#94a3b8",
  type:       "#c084fc",
  config:     "#f472b6",
  middleware: "#4ade80",
  other:      "#52525b",
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
  other:      "Other",
};

export { CATEGORY_COLOR, CATEGORY_LABEL };

const FONT_SANS = "'Geist', system-ui, -apple-system, sans-serif";
const FONT_MONO = "'Geist Mono', 'SF Mono', Menlo, monospace";

const NODE_WIDTH = 210;
const NODE_HEIGHT = 58;

const STATUS_COLOR: Record<string, string> = {
  entry: "#4ade80",
  live: "#3b82f6",
  dead: "#ef4444",
};

// --- Dagre layout ---

function getLayoutedNodes(
  graphNodes: GraphNode[],
  graphEdges: { id: string; source: string; target: string }[],
  onHover: (id: string | null) => void,
  hoveredId: string | null
): Node<CodeNodeData>[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", ranksep: 60, nodesep: 32, marginx: 40, marginy: 40 });

  for (const n of graphNodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const e of graphEdges) {
    // dagre requires both source and target to exist
    if (g.hasNode(e.source) && g.hasNode(e.target)) {
      g.setEdge(e.source, e.target);
    }
  }

  dagre.layout(g);

  return graphNodes.map((n) => {
    const pos = g.node(n.id);
    return {
      id: n.id,
      type: "codeNode",
      position: {
        x: pos ? pos.x - NODE_WIDTH / 2 : 0,
        y: pos ? pos.y - NODE_HEIGHT / 2 : 0,
      },
      data: { label: n.label, raw: n, onHover, hoveredId, activeCategory: null },
    };
  });
}

// --- Custom node component ---

interface CodeNodeData {
  label: string;
  raw: GraphNode;
  onHover: (id: string | null) => void;
  hoveredId: string | null;
  activeCategory: NodeCategory | null;
  [key: string]: unknown;
}

function CodeNode({ data }: NodeProps<Node<CodeNodeData>>) {
  const node = data.raw;
  const color = STATUS_COLOR[node.status] ?? "#2a2a2a";
  const isHovered = data.hoveredId === node.id;
  const isDimmed = data.activeCategory !== null && node.category !== data.activeCategory;

  return (
    <div
      onMouseEnter={() => data.onHover(node.id)}
      onMouseLeave={() => data.onHover(null)}
      style={{
        position: "relative",
        fontFamily: FONT_SANS,
        opacity: isDimmed ? 0.1 : 1,
        transition: "opacity 0.2s ease",
        pointerEvents: isDimmed ? "none" : "auto",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#333", border: "none", width: 6, height: 6 }}
      />

      {/* Node card */}
      <div
        style={{
          background: "rgba(22, 22, 24, 0.97)",
          border: `1.5px solid ${isHovered ? color : `${color}45`}`,
          borderRadius: 8,
          padding: "9px 13px 9px 12px",
          minWidth: NODE_WIDTH,
          maxWidth: NODE_WIDTH,
          cursor: "pointer",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          boxShadow: isHovered
            ? `0 0 0 2px ${color}15, 0 6px 20px rgba(0,0,0,0.5)`
            : "0 1px 3px rgba(0,0,0,0.3)",
          position: "relative",
        }}
      >
        {/* Status dot */}
        <div
          style={{
            position: "absolute",
            top: 9,
            right: 10,
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            boxShadow: isHovered ? `0 0 8px ${color}70` : `0 0 4px ${color}40`,
            transition: "box-shadow 0.15s ease",
          }}
        />

        {/* Filename */}
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 12,
            fontWeight: 500,
            color: "#e8e8e8",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 168,
            paddingRight: 14,
            lineHeight: "17px",
          }}
        >
          {node.label}
        </div>

        {/* Category + lines row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase" as const,
              color: CATEGORY_COLOR[node.category] ?? "#52525b",
              background: `${CATEGORY_COLOR[node.category] ?? "#52525b"}18`,
              border: `1px solid ${CATEGORY_COLOR[node.category] ?? "#52525b"}30`,
              borderRadius: 3,
              padding: "1px 5px",
              lineHeight: "14px",
              flexShrink: 0,
            }}
          >
            {CATEGORY_LABEL[node.category] ?? node.category}
          </span>
          <span style={{ fontSize: 10, color: "#3a3a3a", lineHeight: "14px", fontFamily: FONT_SANS }}>
            {node.loc.toLocaleString()} lines
          </span>
        </div>
      </div>

      {/* Hover tooltip — full description */}
      {isHovered && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(22, 22, 24, 0.98)",
            border: "1px solid #333",
            borderRadius: 7,
            padding: "9px 12px",
            zIndex: 100,
            width: 260,
            boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 1px 4px rgba(0,0,0,0.4)",
            pointerEvents: "none" as const,
          }}
        >
          {/* Description */}
          <div
            style={{
              fontSize: 12,
              color: "#e8e8e8",
              fontWeight: 500,
              lineHeight: "17px",
              fontFamily: FONT_SANS,
              letterSpacing: "-0.01em",
            }}
          >
            {node.description}
          </div>

          {/* Full path */}
          <div
            style={{
              fontSize: 10,
              color: "#484848",
              fontFamily: FONT_MONO,
              marginTop: 5,
              lineHeight: "14px",
              wordBreak: "break-all" as const,
            }}
          >
            {node.path}
          </div>

          {/* Dead exports warning */}
          {node.deadExports.length > 0 && (
            <div
              style={{
                marginTop: 7,
                fontSize: 10,
                color: "#ef4444",
                fontFamily: FONT_SANS,
                display: "flex",
                alignItems: "center",
                gap: 5,
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
        style={{ background: "#333", border: "none", width: 6, height: 6 }}
      />
    </div>
  );
}

const nodeTypes = { codeNode: CodeNode };

function toFlowEdges(
  graphEdges: { id: string; source: string; target: string }[]
): Edge[] {
  return graphEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    style: { stroke: "#2e2e2e", strokeWidth: 1 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#2e2e2e",
      width: 14,
      height: 10,
    },
  }));
}

interface Props {
  graph: GraphData;
  onSelect: (node: GraphNode | null) => void;
  activeCategory: NodeCategory | null;
}

export function CodeGraph({ graph, onSelect, activeCategory }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const onHover = useCallback((id: string | null) => setHoveredId(id), []);

  const initialNodes = useMemo(
    () => getLayoutedNodes(graph.nodes, graph.edges, onHover, hoveredId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph.nodes, graph.edges]
  );

  const initialEdges = useMemo(() => toFlowEdges(graph.edges), [graph.edges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Propagate hoveredId and activeCategory into node data without re-running dagre
  const displayNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: { ...n.data, hoveredId, onHover, activeCategory },
      })),
    [nodes, hoveredId, onHover, activeCategory]
  );

  // Dim edges where either endpoint is in a non-active category
  const activeNodeIds = useMemo(() => {
    if (!activeCategory) return null;
    return new Set(graph.nodes.filter((n) => n.category === activeCategory).map((n) => n.id));
  }, [graph.nodes, activeCategory]);

  const displayEdges = useMemo(
    () =>
      edges.map((e) => {
        const dimmed = activeNodeIds !== null && (!activeNodeIds.has(e.source) || !activeNodeIds.has(e.target));
        return {
          ...e,
          style: { stroke: dimmed ? "#1e1e1e" : "#2e2e2e", strokeWidth: 1 },
          markerEnd: dimmed
            ? { type: MarkerType.ArrowClosed, color: "#1e1e1e", width: 14, height: 10 }
            : { type: MarkerType.ArrowClosed, color: "#2e2e2e", width: 14, height: 10 },
        };
      }),
    [edges, activeNodeIds]
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const raw = (node.data as CodeNodeData).raw;
      onSelect(raw);
    },
    [onSelect]
  );

  const onPaneClick = useCallback(() => onSelect(null), [onSelect]);

  // Suppress unused setNodes warning — needed by useNodesState
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
      fitViewOptions={{ padding: 0.12 }}
      minZoom={0.04}
      maxZoom={2}
      colorMode="dark"
      proOptions={{ hideAttribution: true }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        color="#252525"
        size={1}
        style={{ background: "#111111" }}
      />
      <Controls
        showInteractive={false}
        style={{
          background: "rgba(22, 22, 24, 0.92)",
          backdropFilter: "blur(12px)",
          border: "1px solid #2a2a2a",
          borderRadius: 8,
          overflow: "hidden",
        }}
      />
      <MiniMap
        style={{
          background: "rgba(22, 22, 24, 0.92)",
          border: "1px solid #2a2a2a",
          borderRadius: 8,
          overflow: "hidden",
        }}
        maskColor="rgba(0,0,0,0.55)"
        nodeColor={(n) => STATUS_COLOR[(n.data as CodeNodeData).raw?.status] ?? "#2a2a2a"}
        pannable
        zoomable
      />
    </ReactFlow>
  );
}
