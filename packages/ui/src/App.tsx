import { useEffect, useState } from "react";
import type { GraphData, GraphNode } from "./types.ts";
import { CodeGraph } from "./CodeGraph.tsx";
import { NodeDetail } from "./NodeDetail.tsx";
import { Legend } from "./Legend.tsx";

const FONT_SANS = "'Geist', system-ui, -apple-system, sans-serif";
const FONT_MONO = "'Geist Mono', 'SF Mono', Menlo, monospace";

export default function App() {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);

  useEffect(() => {
    fetch("/api/graph")
      .then((r) => r.json())
      .then(setGraph)
      .catch((e: unknown) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <div style={styles.center}>
        <div style={styles.errorCard}>
          <div style={styles.errorDot} />
          <p style={styles.errorText}>Failed to load graph</p>
          <p style={styles.errorDetail}>{error}</p>
        </div>
      </div>
    );
  }

  if (!graph) {
    return (
      <div style={styles.center}>
        <div style={styles.loadingCard}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Analyzing codebase</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>nodemap</span>
        </div>

        <div style={styles.headerCenter}>
          <span style={styles.rootPath}>{graph.root}</span>
        </div>

        <div style={styles.headerRight}>
          <Chip color="#4ade80" count={graph.stats.entries} label="entries" />
          <Chip color="#3b82f6" count={graph.stats.live} label="live" />
          <Chip color="#ef4444" count={graph.stats.dead} label="dead" />
          <ChipMuted count={graph.stats.total} label="total" />
        </div>
      </div>

      <div style={styles.canvas}>
        <CodeGraph graph={graph} onSelect={setSelected} />
        <Legend />
      </div>

      {selected && (
        <NodeDetail node={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function Chip({
  color,
  count,
  label,
}: {
  color: string;
  count: number;
  label: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 500,
        fontFamily: FONT_SANS,
        padding: "3px 8px",
        borderRadius: 6,
        background: `${color}10`,
        border: `1px solid ${color}25`,
        color,
        letterSpacing: "0.01em",
        lineHeight: "16px",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 4px ${color}40`,
          flexShrink: 0,
        }}
      />
      <span style={{ fontFamily: FONT_MONO, fontWeight: 600, fontSize: 11 }}>
        {count}
      </span>
      {label}
    </span>
  );
}

function ChipMuted({ count, label }: { count: number; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 500,
        fontFamily: FONT_SANS,
        padding: "3px 8px",
        borderRadius: 6,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        color: "#555",
        letterSpacing: "0.01em",
        lineHeight: "16px",
      }}
    >
      <span style={{ fontFamily: FONT_MONO, fontWeight: 600, fontSize: 11, color: "#888" }}>
        {count}
      </span>
      {label}
    </span>
  );
}

const styles = {
  root: {
    display: "flex",
    flexDirection: "column" as const,
    height: "100vh",
    background: "#111111",
    color: "#f0f0f0",
    fontFamily: FONT_SANS,
    position: "relative" as const,
  },
  header: {
    display: "flex",
    alignItems: "center",
    height: 44,
    padding: "0 16px",
    borderBottom: "1px solid #2a2a2a",
    background: "rgba(17, 17, 17, 0.8)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    flexShrink: 0,
    zIndex: 10,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    minWidth: 80,
  },
  logo: {
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: "-0.03em",
    color: "#f0f0f0",
    fontFamily: FONT_SANS,
  },
  headerCenter: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    overflow: "hidden",
    padding: "0 16px",
  },
  rootPath: {
    fontSize: 11,
    color: "#555",
    fontFamily: FONT_MONO,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    maxWidth: 400,
  },
  headerRight: {
    display: "flex",
    gap: 6,
    alignItems: "center",
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
    background: "#111111",
    fontFamily: FONT_SANS,
  },
  errorCard: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 10,
    padding: "32px 40px",
    background: "#1c1c1e",
    border: "1px solid #2a2a2a",
    borderRadius: 12,
    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
  },
  errorDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#ef4444",
    boxShadow: "0 0 8px rgba(239,68,68,0.4)",
    marginBottom: 4,
  },
  errorText: {
    color: "#f0f0f0",
    fontSize: 14,
    fontWeight: 600,
    margin: 0,
  },
  errorDetail: {
    color: "#555",
    fontSize: 12,
    fontFamily: FONT_MONO,
    margin: 0,
    maxWidth: 360,
    textAlign: "center" as const,
    wordBreak: "break-all" as const,
  },
  loadingCard: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 16,
  },
  spinner: {
    width: 20,
    height: 20,
    border: "2px solid #2a2a2a",
    borderTopColor: "#f0f0f0",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    color: "#555",
    fontSize: 13,
    fontWeight: 500,
    margin: 0,
    letterSpacing: "-0.01em",
  },
} as const;
