import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { GraphData, GraphNode } from "./types.ts";

const STATUS_COLOR: Record<string, string> = {
  entry: "#4ade80",
  live: "#60a5fa",
  dead: "#f87171",
};

function toFlowNodes(graphNodes: GraphNode[]): Node[] {
  return graphNodes.map((n, i) => ({
    id: n.id,
    position: { x: (i % 8) * 200, y: Math.floor(i / 8) * 120 },
    data: { label: n.label, raw: n },
    style: {
      background: "#18181b",
      border: `1.5px solid ${STATUS_COLOR[n.status] ?? "#3f3f46"}`,
      borderRadius: 6,
      padding: "6px 10px",
      color: "#e4e4e7",
      fontSize: 12,
      fontFamily: "monospace",
      minWidth: 120,
      cursor: "pointer",
    },
  }));
}

function toFlowEdges(graphEdges: { id: string; source: string; target: string }[]): Edge[] {
  return graphEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    style: { stroke: "#3f3f46", strokeWidth: 1 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#3f3f46" },
  }));
}

interface Props {
  graph: GraphData;
  onSelect: (node: GraphNode | null) => void;
}

export function CodeGraph({ graph, onSelect }: Props) {
  const initialNodes = useMemo(() => toFlowNodes(graph.nodes), [graph.nodes]);
  const initialEdges = useMemo(() => toFlowEdges(graph.edges), [graph.edges]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const raw = (node.data as { raw: GraphNode }).raw;
      onSelect(raw);
    },
    [onSelect]
  );

  const onPaneClick = useCallback(() => onSelect(null), [onSelect]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      fitView
      fitViewOptions={{ padding: 0.1 }}
      minZoom={0.05}
      colorMode="dark"
    >
      <Background variant={BackgroundVariant.Dots} gap={24} color="#27272a" />
      <Controls
        style={{ background: "#18181b", border: "1px solid #27272a" }}
      />
      <MiniMap
        style={{ background: "#111111", border: "1px solid #27272a" }}
        nodeColor={(n) => {
          const raw = (n.data as { raw: GraphNode }).raw;
          return STATUS_COLOR[raw?.status] ?? "#3f3f46";
        }}
      />
    </ReactFlow>
  );
}
