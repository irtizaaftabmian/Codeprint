import { useCallback, useMemo, useState } from "react";
import dagre from "@dagrejs/dagre";
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
import type { GraphData, GraphNode } from "./types.ts";

const FONT_SANS = "'Geist', system-ui, -apple-system, sans-serif";
const FONT_MONO = "'Geist Mono', 'SF Mono', Menlo, monospace";

const NODE_WIDTH = 210;
const NODE_HEIGHT = 58;

const STATUS_COLOR: Record<string, string> = {
  entry: "#4ade80",
  live: "#3b82f6",
  dead: "#ef4444",
};

// --- Smart description from path segments ---

function toWords(segment: string): string {
  // Strip dynamic param brackets: [sessionId] → sessionId
  const clean = segment.replace(/^\[(.+)\]$/, "$1").replace(/^\.\.\.[^)]+/, "");
  // camelCase or kebab to words
  return clean
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .toLowerCase();
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function inferDescription(path: string, loc: number): string {
  const parts = path.split("/");
  const filename = parts[parts.length - 1] ?? "";
  const basename = filename.replace(/\.(ts|tsx|js|jsx)$/, "").toLowerCase();

  // Strip common wrapper dirs that add no meaning
  const SKIP = new Set(["app", "src", "pages", "routes", ".", ""]);
  // Filenames that are structural, not descriptive
  const GENERIC_NAMES = new Set(["page", "route", "layout", "index", "loading", "error", "not-found", "template", "default"]);

  const meaningfulSegments = parts
    .slice(0, -1) // exclude filename
    .filter((s) => !SKIP.has(s.toLowerCase()))
    .map(toWords)
    .filter(Boolean);

  const isGenericFilename = GENERIC_NAMES.has(basename);
  const fileWords = isGenericFilename ? null : toWords(basename);

  // Determine the role suffix from the filename
  let role = "";
  if (basename === "page" || basename === "index") role = "page";
  else if (basename === "route") role = "endpoint";
  else if (basename === "layout") role = "layout";
  else if (basename === "loading") role = "loading state";
  else if (basename === "error") role = "error boundary";
  else if (basename === "middleware" || basename === "proxy") role = "middleware";
  else if (basename.startsWith("use")) role = "hook";
  else if (path.includes("components/") || path.includes("component/")) role = "component";
  else if (path.includes("store") || path.includes("stores/")) role = "store";
  else if (path.includes("lib/") || path.includes("utils/") || path.includes("helpers/")) role = "utility";
  else if (basename === "types" || basename === "type") role = "types";
  else if (basename.includes("config")) role = "config";

  // Build description from segments + role
  let desc = "";
  if (fileWords) {
    // Non-generic filename: use it as the primary noun
    desc = capitalize(fileWords);
    if (meaningfulSegments.length > 0) {
      // Add the most meaningful parent segment as context
      const context = meaningfulSegments[meaningfulSegments.length - 1];
      if (context && context !== fileWords) {
        desc = `${capitalize(fileWords)} (${context})`;
      }
    }
  } else if (meaningfulSegments.length > 0) {
    // Generic filename: describe via path segments
    const joined = meaningfulSegments
      .slice(-3) // take last 3 segments max
      .map((s, i, arr) => (i === arr.length - 1 ? capitalize(s) : s))
      .join(" › ");
    desc = joined;
    if (role) desc = `${desc} ${role}`;
  } else {
    desc = role ? capitalize(role) : "Module";
  }

  return `${desc} · ${loc.toLocaleString()} lines`;
}

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
      data: { label: n.label, raw: n, onHover, hoveredId },
    };
  });
}

// --- Custom node component ---

interface CodeNodeData {
  label: string;
  raw: GraphNode;
  onHover: (id: string | null) => void;
  hoveredId: string | null;
  [key: string]: unknown;
}

function CodeNode({ data }: NodeProps<Node<CodeNodeData>>) {
  const node = data.raw;
  const color = STATUS_COLOR[node.status] ?? "#2a2a2a";
  const isHovered = data.hoveredId === node.id;

  return (
    <div
      onMouseEnter={() => data.onHover(node.id)}
      onMouseLeave={() => data.onHover(null)}
      style={{ position: "relative", fontFamily: FONT_SANS }}
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

        {/* Lines count */}
        <div
          style={{
            fontSize: 10,
            color: "#444",
            marginTop: 4,
            lineHeight: "13px",
            fontFamily: FONT_SANS,
          }}
        >
          {node.loc.toLocaleString()} lines
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
            {inferDescription(node.path, node.loc)}
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
}

export function CodeGraph({ graph, onSelect }: Props) {
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

  // Propagate hoveredId into node data without re-running dagre
  const displayNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: { ...n.data, hoveredId, onHover },
      })),
    [nodes, hoveredId, onHover]
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
      edges={edges}
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
