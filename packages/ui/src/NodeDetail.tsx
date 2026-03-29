import { useEffect, useState } from "react";
import type { GraphNode } from "./types.ts";

const STATUS_LABEL: Record<string, string> = {
  entry: "Entry Point",
  live: "Live",
  dead: "Dead",
};

const STATUS_COLOR: Record<string, string> = {
  entry: "#4ade80",
  live: "#3b82f6",
  dead: "#ef4444",
};

const STATUS_BG: Record<string, string> = {
  entry: "rgba(74, 222, 128, 0.1)",
  live: "rgba(59, 130, 246, 0.1)",
  dead: "rgba(239, 68, 68, 0.1)",
};

interface Props {
  node: GraphNode;
  root: string;
  isDark: boolean;
  onClose: () => void;
}

export function NodeDetail({ node, root, isDark, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  function copyPath() {
    navigator.clipboard.writeText(node.path).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const statusColor = STATUS_COLOR[node.status] ?? "#888";
  const statusBg = STATUS_BG[node.status] ?? "transparent";
  const statusLabel = STATUS_LABEL[node.status] ?? node.status;

  const bg      = isDark ? "rgba(28,28,30,0.92)"    : "rgba(250,250,252,0.95)";
  const border  = isDark ? "#2a2a2a"               : "#e0e0e0";
  const textPri = isDark ? "#f0f0f0"               : "#1a1a1a";
  const textSec = isDark ? "#888"                  : "#666";
  const textMut = isDark ? "#555"                  : "#aaa";
  const sepClr  = isDark ? "#2a2a2a"               : "#e8e8e8";
  const monoClr = isDark ? "#888"                  : "#666";

  return (
    <div
      style={{
        ...styles.panel,
        background:           bg,
        borderLeftColor:      border,
        transform: visible ? "translateX(0)" : "translateX(16px)",
        opacity:   visible ? 1 : 0,
      }}
    >
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <span style={{ ...styles.title, color: textPri }}>{node.label}</span>
          <button onClick={onClose} style={{ ...styles.close, borderColor: border, color: textSec }} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
                stroke={isDark ? "#555" : "#999"}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <span
          style={{
            ...styles.statusBadge,
            color: statusColor,
            background: statusBg,
            borderColor: `${statusColor}30`,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: statusColor,
              display: "inline-block",
              boxShadow: `0 0 6px ${statusColor}40`,
            }}
          />
          {statusLabel}
        </span>
      </div>

      {/* Description */}
      {node.description && (
        <div
          style={{
            marginTop:     14,
            fontSize:      13,
            color:         textSec,
            lineHeight:    "19px",
            fontFamily:    FONT_SANS,
            letterSpacing: "-0.01em",
          }}
        >
          {node.description}
        </div>
      )}

      <div style={{ ...styles.separator, background: sepClr }} />

      {/* Open in editor buttons */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <button
          onClick={() => window.open(`vscode://file/${root}/${node.path}`)}
          style={{ ...styles.editorBtn, borderColor: border, color: textSec, background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}
          title="Open in VS Code"
        >
          <svg width="13" height="13" viewBox="0 0 100 100" fill="none" style={{ flexShrink: 0 }}>
            <path d="M74.8 5.9L40.2 37.5 17.3 19.4 5.8 25.9l22.5 24.1L5.8 74.1l11.5 6.5L40.2 62.5l34.6 31.6L94.2 85V15L74.8 5.9z" fill="#007ACC"/>
          </svg>
          VS Code
        </button>
        <button
          onClick={() => window.open(`cursor://file/${root}/${node.path}`)}
          style={{ ...styles.editorBtn, borderColor: border, color: textSec, background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}
          title="Open in Cursor"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <rect width="24" height="24" rx="4" fill="#1a1a1a"/>
            <path d="M6 6l6 6-6 6M12 18h6" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Cursor
        </button>
        <button
          onClick={copyPath}
          style={{ ...styles.editorBtn, borderColor: copied ? "#22C55E40" : border, color: copied ? "#22C55E" : textSec, background: copied ? "rgba(34,197,94,0.08)" : (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"), transition: "all 0.2s ease" }}
          title="Copy path for LLM"
        >
          {copied ? (
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
              <path d="M2 6.5l3.5 3.5 5.5-6" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
              <rect x="1" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M4 4V2.5A1.5 1.5 0 015.5 1h5A1.5 1.5 0 0112 2.5v5A1.5 1.5 0 0110.5 9H9" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
          )}
          {copied ? "Copied!" : "Copy path"}
        </button>
      </div>

      <div style={styles.rows}>
        <Row label="Path" labelColor={textMut}>
          <span style={{ ...styles.monoValue, color: monoClr }}>{node.path}</span>
        </Row>
        <Row label="Kind" labelColor={textMut}>
          <span style={{ ...styles.rowValue, color: textSec }}>{node.kind}</span>
        </Row>
        <Row label="Lines" labelColor={textMut}>
          <span style={{ ...styles.rowValue, color: textSec }}>{node.loc.toLocaleString()}</span>
        </Row>
      </div>

      {node.exports.length > 0 && (
        <>
          <div style={{ ...styles.separator, background: sepClr }} />
          <div style={styles.section}>
            <div style={{ ...styles.sectionLabel, color: textMut }}>
              Exports
              <span style={{
                ...styles.sectionCount,
                color: isDark ? "#888" : "#555",
                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
              }}>{node.exports.length}</span>
            </div>
            <div style={styles.tagList}>
              {node.exports.map((e) => (
                <span key={e} style={{
                  ...styles.exportTag,
                  color: isDark ? "#888" : "#555",
                  background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                  border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)",
                }}>
                  {e}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {node.deadExports.length > 0 && (
        <>
          <div style={{ ...styles.separator, background: sepClr }} />
          <div style={styles.section}>
            <div style={{ ...styles.sectionLabel, color: textMut }}>
              Dead Exports
              <span style={styles.sectionCountDead}>
                {node.deadExports.length}
              </span>
            </div>
            <div style={styles.tagList}>
              {node.deadExports.map((e) => (
                <span key={e} style={styles.deadTag}>
                  {e}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Row({
  label,
  labelColor,
  children,
}: {
  label: string;
  labelColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={styles.row}>
      <span style={{ ...styles.rowLabel, color: labelColor ?? styles.rowLabel.color }}>{label}</span>
      {children}
    </div>
  );
}

const FONT_SANS = "'Geist', system-ui, -apple-system, sans-serif";
const FONT_MONO = "'Geist Mono', 'SF Mono', Menlo, monospace";

const styles = {
  panel: {
    position: "absolute" as const,
    top: 0,
    right: 0,
    bottom: 0,
    width: 320,
    background: "rgba(28, 28, 30, 0.92)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderLeft: "1px solid #2a2a2a",
    padding: "20px",
    zIndex: 20,
    display: "flex",
    flexDirection: "column" as const,
    gap: 0,
    overflowY: "auto" as const,
    fontFamily: FONT_SANS,
    transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease",
  },
  header: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
    marginBottom: 0,
  },
  titleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  title: {
    fontWeight: 600,
    fontSize: 15,
    fontFamily: FONT_MONO,
    color: "#f0f0f0",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    flex: 1,
    letterSpacing: "-0.01em",
  },
  close: {
    background: "none",
    border: "1px solid #2a2a2a",
    borderRadius: 6,
    color: "#555",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    flexShrink: 0,
    transition: "border-color 0.15s ease, background 0.15s ease",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    fontWeight: 500,
    padding: "4px 10px",
    borderRadius: 100,
    border: "1px solid",
    width: "fit-content",
    letterSpacing: "0.02em",
  },
  separator: {
    height: 1,
    background: "#2a2a2a",
    margin: "16px 0",
    flexShrink: 0,
  },
  rows: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  row: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    fontSize: 13,
  },
  rowLabel: {
    color: "#555",
    minWidth: 48,
    flexShrink: 0,
    fontWeight: 500,
    fontSize: 12,
    lineHeight: "20px",
  },
  rowValue: {
    color: "#888",
    fontSize: 13,
    lineHeight: "20px",
  },
  monoValue: {
    fontFamily: FONT_MONO,
    color: "#888",
    wordBreak: "break-all" as const,
    fontSize: 11,
    lineHeight: "18px",
  },
  section: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#555",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  sectionCount: {
    fontSize: 10,
    fontWeight: 500,
    color: "#888",
    background: "rgba(255,255,255,0.06)",
    borderRadius: 4,
    padding: "1px 6px",
  },
  sectionCountDead: {
    fontSize: 10,
    fontWeight: 500,
    color: "#ef4444",
    background: "rgba(239, 68, 68, 0.1)",
    borderRadius: 4,
    padding: "1px 6px",
  },
  tagList: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 4,
  },
  exportTag: {
    fontSize: 11,
    fontFamily: FONT_MONO,
    color: "#888",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 4,
    padding: "2px 8px",
  },
  deadTag: {
    fontSize: 11,
    fontFamily: FONT_MONO,
    color: "#ef4444",
    background: "rgba(239, 68, 68, 0.08)",
    border: "1px solid rgba(239, 68, 68, 0.15)",
    borderRadius: 4,
    padding: "2px 8px",
  },
  editorBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    fontWeight: 500,
    fontFamily: FONT_SANS,
    padding: "5px 10px",
    borderRadius: 6,
    border: "1px solid #2a2a2a",
    background: "rgba(255,255,255,0.04)",
    color: "#888",
    cursor: "pointer",
    flex: 1,
    justifyContent: "center",
    transition: "border-color 0.15s ease, color 0.15s ease",
  },
} as const;
