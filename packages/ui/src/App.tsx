import { useEffect, useState } from "react";
import type { GraphData, GraphNode } from "./types.ts";
import { CodeGraph } from "./CodeGraph.tsx";
import { NodeDetail } from "./NodeDetail.tsx";
import { Legend } from "./Legend.tsx";

export default function App() {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);

  useEffect(() => {
    fetch("/api/graph")
      .then((r) => r.json())
      .then(setGraph)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <div style={styles.center}>
        <p style={{ color: "#f87171" }}>Failed to load graph: {error}</p>
      </div>
    );
  }

  if (!graph) {
    return (
      <div style={styles.center}>
        <p style={{ color: "#71717a" }}>Analyzing codebase…</p>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.logo}>nodemap</span>
        <span style={styles.root_path}>{graph.root}</span>
        <div style={styles.stats}>
          <Chip color="#4ade80">{graph.stats.entries} entries</Chip>
          <Chip color="#60a5fa">{graph.stats.live} live</Chip>
          <Chip color="#f87171">{graph.stats.dead} dead</Chip>
          <Chip color="#71717a">{graph.stats.total} total</Chip>
        </div>
      </div>

      {/* Main canvas */}
      <div style={styles.canvas}>
        <CodeGraph graph={graph} onSelect={setSelected} />
        <Legend />
      </div>

      {/* Side panel */}
      {selected && (
        <NodeDetail node={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function Chip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ ...styles.chip, borderColor: color, color }}>{children}</span>
  );
}

const styles = {
  root: {
    display: "flex",
    flexDirection: "column" as const,
    height: "100vh",
    background: "#0a0a0a",
    color: "#e4e4e7",
    fontFamily: "system-ui, sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "10px 16px",
    borderBottom: "1px solid #27272a",
    background: "#111111",
    flexShrink: 0,
  },
  logo: {
    fontWeight: 700,
    fontSize: 15,
    letterSpacing: "-0.02em",
    color: "#e4e4e7",
  },
  root_path: {
    fontSize: 12,
    color: "#52525b",
    fontFamily: "monospace",
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  stats: {
    display: "flex",
    gap: 6,
  },
  chip: {
    fontSize: 11,
    fontWeight: 500,
    padding: "2px 7px",
    borderRadius: 4,
    border: "1px solid",
    background: "transparent",
  },
  canvas: {
    flex: 1,
    position: "relative" as const,
  },
  center: {
    display: "flex",
    height: "100vh",
    alignItems: "center",
    justifyContent: "center",
  },
} as const;
