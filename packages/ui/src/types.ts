export type NodeStatus = "live" | "dead" | "entry";
export type NodeKind = "file" | "function" | "class" | "type" | "variable";
export type NodeCategory = "page" | "api" | "layout" | "component" | "hook" | "store" | "util" | "type" | "config" | "middleware" | "other";

export interface GraphNode {
  id: string;
  label: string;
  path: string;
  kind: NodeKind;
  status: NodeStatus;
  category: NodeCategory;
  loc: number;
  exports: string[];
  deadExports: string[];
  description: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    total: number;
    live: number;
    dead: number;
    entries: number;
  };
  analyzedAt: string;
  root: string;
}
