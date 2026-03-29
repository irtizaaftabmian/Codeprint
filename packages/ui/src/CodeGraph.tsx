import { useCallback, useMemo, useState } from "react";
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

const STATUS_COLOR: Record<string, string> = {
  entry: "#4ade80",
  live: "#3b82f6",
  dead: "#ef4444",
};

function inferDescription(path: string, loc: number): string {
  const lower = path.toLowerCase();
  const filename = lower.split("/").pop() ?? "";
  const basename = filename.replace(/\.(ts|tsx|js|jsx)$/, "");

  let desc = "Module";

  if (filename === "route.ts" || filename === "route.tsx") {
    desc = "API route handler";
  } else if (filename === "page.tsx" || filename === "page.ts") {
    desc = "Next.js page component";
  } else if (filename === "layout.tsx" || filename === "layout.ts") {
    desc = "Root layout wrapper";
  } else if (filename === "middleware.ts" || filename === "proxy.ts") {
    desc = "Request middleware";
  } else if (lower.includes("store")) {
    desc = "State store";
  } else if (lower.includes("hook") || basename.startsWith("use")) {
    desc = "React hook";
  } else if (lower.includes("component") || lower.includes("components/")) {
    desc = "UI component";
  } else if (lower.includes("lib/") || lower.includes("utils/")) {
    desc = "Utility module";
  } else if (filename === "types.ts" || filename === "types.tsx") {
    desc = "Type definitions";
  } else if (basename.includes("config")) {
    desc = "Configuration";
  }

  return `${desc} \u00b7 ${loc.toLocaleString()} lines`;
}

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
      style={{
        position: "relative",
        fontFamily: FONT_SANS,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: "#2a2a2a",
          border: "none",
          width: 6,
          height: 6,
        }}
      />

      <div
        style={{
          background: "rgba(28, 28, 30, 0.95)",
          border: `1.5px solid ${isHovered ? color : `${color}60`}`,
          borderRadius: 8,
          padding: "10px 14px",
          minWidth: 160,
          maxWidth: 200,
          cursor: "pointer",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          boxShadow: isHovered
            ? `0 0 0 1px ${color}20, 0 4px 16px rgba(0,0,0,0.4)`
            : "0 1px 2px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.15)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 6px ${color}50`,
          }}
        />

        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 12,
            fontWeight: 500,
            color: "#f0f0f0",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 160,
            paddingRight: 14,
            lineHeight: "18px",
          }}
        >
          {node.label}
        </div>

        <div
          style={{
            fontSize: 10,
            color: "#555",
            fontWeight: 400,
            marginTop: 3,
            lineHeight: "14px",
          }}
        >
          {node.loc.toLocaleString()} lines
        </div>
      </div>

      {isHovered && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(28, 28, 30, 0.95)",
            border: "1px solid #2a2a2a",
            borderRadius: 6,
            padding: "8px 12px",
            zIndex: 50,
            minWidth: 180,
            maxWidth: 240,
            boxShadow: "0 4px 20px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)",
            pointerEvents: "none" as const,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#f0f0f0",
              fontWeight: 400,
              lineHeight: "16px",
              fontFamily: FONT_SANS,
            }}
          >
            {inferDescription(node.path, node.loc)}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#555",
              fontFamily: FONT_MONO,
              marginTop: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: "14px",
            }}
          >
            {node.path}
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: "#2a2a2a",
          border: "none",
          width: 6,
          height: 6,
        }}
      />
    </div>
  );
}

const nodeTypes = { codeNode: CodeNode };

function toFlowNodes(
  graphNodes: GraphNode[],
  onHover: (id: string | null) => void,
  hoveredId: string | null
): Node<CodeNodeData>[] {
  return graphNodes.map((n, i) => ({
    id: n.id,
    type: "codeNode",
    position: { x: (i % 8) * 220, y: Math.floor(i / 8) * 140 },
    data: { label: n.label, raw: n, onHover, hoveredId },
  }));
}

function toFlowEdges(
  graphEdges: { id: string; source: string; target: string }[]
): Edge[] {
  return graphEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    style: { stroke: "#2a2a2a", strokeWidth: 1 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#2a2a2a",
      width: 16,
      height: 12,
    },
    animated: false,
  }));
}

interface Props {
  graph: GraphData;
  onSelect: (node: GraphNode | null) => void;
}

export function CodeGraph({ graph, onSelect }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const onHover = useCallback((id: string | null) => {
    setHoveredId(id);
  }, []);

  const initialNodes = useMemo(
    () => toFlowNodes(graph.nodes, onHover, hoveredId),
    [graph.nodes, onHover, hoveredId]
  );
  const initialEdges = useMemo(
    () => toFlowEdges(graph.edges),
    [graph.edges]
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const raw = (node.data as CodeNodeData).raw;
      onSelect(raw);
    },
    [onSelect]
  );

  const onPaneClick = useCallback(() => onSelect(null), [onSelect]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.05}
      maxZoom={2}
      colorMode="dark"
      proOptions={{ hideAttribution: true }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        color="#2a2a2a"
        size={1}
        style={{ background: "#1a1a1a" }}
      />
      <Controls
        showInteractive={false}
        style={{
          background: "rgba(28, 28, 30, 0.9)",
          backdropFilter: "blur(12px)",
          border: "1px solid #2a2a2a",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}
      />
      <MiniMap
        style={{
          background: "rgba(28, 28, 30, 0.9)",
          border: "1px solid #2a2a2a",
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }}
        maskColor="rgba(0, 0, 0, 0.6)"
        nodeColor={(n) => {
          const raw = (n.data as CodeNodeData).raw;
          return STATUS_COLOR[raw?.status] ?? "#2a2a2a";
        }}
        pannable
        zoomable
      />
    </ReactFlow>
  );
}
