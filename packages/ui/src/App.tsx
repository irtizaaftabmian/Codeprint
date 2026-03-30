import { useEffect, useMemo, useState } from "react";
import type { GraphData, GraphNode, NodeCategory } from "./types.ts";
import { CodeGraph, CATEGORY_COLOR, CATEGORY_LABEL } from "./CodeGraph.tsx";
import { NodeDetail } from "./NodeDetail.tsx";
import { Legend } from "./Legend.tsx";

const FONT_SANS = "'Geist', system-ui, -apple-system, sans-serif";
const FONT_MONO = "'Geist Mono', 'SF Mono', Menlo, monospace";

export default function App() {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [activeCategory, setActiveCategory] = useState<NodeCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    fetch("/api/graph")
      .then((r) => r.json())
      .then(setGraph)
      .catch((e: unknown) => setError(String(e)));
  }, []);

  // Must be before any early returns — Rules of Hooks
  const categories = useMemo(() => {
    if (!graph) return [];
    const counts = new Map<NodeCategory, number>();
    for (const n of graph.nodes) counts.set(n.category, (counts.get(n.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]) as [NodeCategory, number][];
  }, [graph]);

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
    <div style={{ ...styles.root, background: isDark ? "#1C1917" : "#F8F7F4", color: isDark ? "#f0f0f0" : "#1a1a1a" }}>
      <div style={{ ...styles.header, background: isDark ? "rgba(28,25,23,0.85)" : "rgba(252,251,249,0.92)", borderBottomColor: isDark ? "#2D2A27" : "#E0DCD6" }}>
        <div style={{ ...styles.headerLeft, gap: 8 }}>
          <img
            src="/logo.png"
            alt="codeprint"
            style={{
              height: 22,
              width: "auto",
              filter: isDark ? "none" : "invert(1)",
              opacity: isDark ? 1 : 0.75,
            }}
          />
          <span style={{ ...styles.logo, color: isDark ? "#f0f0f0" : "#1a1a1a" }}>codeprint</span>
        </div>

        <div style={styles.headerCenter}>
          <span style={{ ...styles.rootPath, color: isDark ? "#787068" : "#8A8480" }}>{graph.root}</span>
        </div>

        <div style={styles.headerRight}>
          {/* Theme toggle */}
          <button
            onClick={() => setIsDark((d) => !d)}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              background: "none",
              border: `1px solid ${isDark ? "#3D3935" : "#E0DCD6"}`,
              borderRadius: 7,
              width: 28,
              height: 28,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isDark ? "#787068" : "#8A8480",
              flexShrink: 0,
              transition: "border-color 0.15s, color 0.15s",
            }}
          >
            {isDark ? (
              /* Sun icon */
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            ) : (
              /* Moon icon */
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>

          {/* Search */}
          <div style={{
            ...styles.searchWrap,
            background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
            border: `1px solid ${isDark ? "#3D3935" : "#E0DCD6"}`,
          }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="5" cy="5" r="3.5" stroke={isDark ? "#787068" : "#8A8480"} strokeWidth="1.3"/>
              <path d="M8 8l2.5 2.5" stroke={isDark ? "#787068" : "#8A8480"} strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...styles.searchInput, color: isDark ? "#ccc" : "#1a1a1a" }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={styles.searchClear}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 2l6 6M8 2L2 8" stroke={isDark ? "#787068" : "#8A8480"} strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

          <div style={{ ...styles.statDivider, background: isDark ? "#3D3935" : "#D4CFC8" }} />

          <Chip color="#22C55E" count={graph.stats.entries} label="entries" isDark={isDark} />
          <Chip color="#3B82F6" count={graph.stats.live} label="live" isDark={isDark} />
          <Chip color="#EF4444" count={graph.stats.dead} label="dead" isDark={isDark} />
          <ChipMuted count={graph.stats.total} label="total" isDark={isDark} />
          {graph.languages && graph.languages.length > 0 && (
            <>
              <div style={{ ...styles.statDivider, background: isDark ? "#3D3935" : "#D4CFC8" }} />
              <span style={{ fontSize: 11, color: isDark ? "#787068" : "#8A8480", fontFamily: "'Geist', system-ui, sans-serif" }}>
                {graph.languages.join(", ")}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Category filter bar */}
      <div style={{ ...styles.filterBar, background: isDark ? "#171412" : "#F0EDE8", borderBottomColor: isDark ? "#2D2A27" : "#E0DCD6" }}>
        <button
          onClick={() => setActiveCategory(null)}
          style={{
            ...styles.filterChip,
            borderColor: activeCategory === null ? (isDark ? "#787068" : "#8A8480") : (isDark ? "#3D3935" : "#D4CFC8"),
            color: activeCategory === null ? (isDark ? "#f0f0f0" : "#1a1a1a") : (isDark ? "#787068" : "#6B6560"),
            background: activeCategory === null ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)") : "transparent",
          }}
        >
          All
        </button>
        {categories.map(([cat, count]) => {
          const color = CATEGORY_COLOR[cat];
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(isActive ? null : cat)}
              style={{
                ...styles.filterChip,
                borderColor: isActive ? color : `${color}40`,
                color: isActive ? color : (isDark ? "#787068" : "#6B6560"),
                background: isActive ? `${color}18` : "transparent",
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
              {CATEGORY_LABEL[cat]}
              <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: isActive ? color : (isDark ? "#787068" : "#8A8480") }}>{count}</span>
            </button>
          );
        })}
      </div>

      <div style={styles.canvas}>
        <CodeGraph graph={graph} onSelect={setSelected} activeCategory={activeCategory} searchQuery={searchQuery} isDark={isDark} />
        <Legend isDark={isDark} />
      </div>

      {selected && (
        <NodeDetail node={selected} root={graph.root} isDark={isDark} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function Chip({
  color,
  count,
  label,
  isDark,
}: {
  color: string;
  count: number;
  label: string;
  isDark: boolean;
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
        background: isDark ? `${color}10` : `${color}12`,
        border: `1px solid ${isDark ? `${color}25` : `${color}30`}`,
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

function ChipMuted({ count, label, isDark }: { count: number; label: string; isDark: boolean }) {
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
        background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
        border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)",
        color: isDark ? "#555" : "#888",
        letterSpacing: "0.01em",
        lineHeight: "16px",
      }}
    >
      <span style={{ fontFamily: FONT_MONO, fontWeight: 600, fontSize: 11, color: isDark ? "#888" : "#555" }}>
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
    background: "#1C1917",
    color: "#f0f0f0",
    fontFamily: FONT_SANS,
    position: "relative" as const,
  },
  header: {
    display: "flex",
    alignItems: "center",
    height: 44,
    padding: "0 16px",
    borderBottom: "1px solid #2D2A27",
    background: "rgba(28, 25, 23, 0.85)",
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
    fontWeight: 600,
    fontSize: 14,
    letterSpacing: "-0.04em",
    color: "#f0f0f0",
    fontFamily: FONT_MONO,
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
    color: "#787068",
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
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid #3D3935",
    borderRadius: 7,
    padding: "0 8px",
    height: 28,
  },
  searchInput: {
    background: "none",
    border: "none",
    outline: "none",
    color: "#ccc",
    fontSize: 12,
    fontFamily: "'Geist', system-ui, sans-serif",
    width: 140,
    padding: 0,
  },
  searchClear: {
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  statDivider: {
    width: 1,
    height: 16,
    background: "#3D3935",
    flexShrink: 0,
  },
  filterBar: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 14px",
    borderBottom: "1px solid #2D2A27",
    background: "#171412",
    flexShrink: 0,
    overflowX: "auto" as const,
    flexWrap: "nowrap" as const,
  },
  filterChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 11,
    fontWeight: 500,
    fontFamily: FONT_SANS,
    padding: "3px 9px",
    borderRadius: 5,
    border: "1px solid #3D3935",
    color: "#787068",
    background: "transparent",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    transition: "all 0.15s ease",
    letterSpacing: "0.01em",
  },
  filterChipActive: {
    borderColor: "#787068",
    color: "#f0f0f0",
    background: "rgba(255,255,255,0.08)",
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
    background: "#1C1917",
    fontFamily: FONT_SANS,
  },
  errorCard: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 10,
    padding: "32px 40px",
    background: "#1C1A18",
    border: "1px solid #2D2A27",
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
    color: "#787068",
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
    border: "2px solid #2D2A27",
    borderTopColor: "#f0f0f0",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    color: "#787068",
    fontSize: 13,
    fontWeight: 500,
    margin: 0,
    letterSpacing: "-0.01em",
  },
} as const;
