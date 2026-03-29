import type { GraphNode } from "./types.ts";

const STATUS_LABEL: Record<string, string> = {
  entry: "Entry Point",
  live: "Live",
  dead: "Dead — not imported anywhere",
};

const STATUS_COLOR: Record<string, string> = {
  entry: "#4ade80",
  live: "#60a5fa",
  dead: "#f87171",
};

interface Props {
  node: GraphNode;
  onClose: () => void;
}

export function NodeDetail({ node, onClose }: Props) {
  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>{node.label}</span>
        <button onClick={onClose} style={styles.close} aria-label="Close">✕</button>
      </div>

      <Row label="Path" value={node.path} mono />
      <Row label="Status">
        <span style={{ color: STATUS_COLOR[node.status] }}>
          {STATUS_LABEL[node.status] ?? node.status}
        </span>
      </Row>
      <Row label="Kind" value={node.kind} />
      <Row label="Lines" value={String(node.loc)} />

      {node.deadExports.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Dead exports ({node.deadExports.length})</div>
          {node.deadExports.map((e) => (
            <div key={e} style={styles.tag}>{e}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  children,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      <span style={mono ? styles.mono : styles.rowValue}>
        {children ?? value}
      </span>
    </div>
  );
}

const styles = {
  panel: {
    position: "absolute" as const,
    top: 12,
    right: 12,
    width: 300,
    background: "#111111",
    border: "1px solid #27272a",
    borderRadius: 8,
    padding: 16,
    zIndex: 10,
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontWeight: 600,
    fontSize: 14,
    fontFamily: "monospace",
    color: "#e4e4e7",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  close: {
    background: "none",
    border: "none",
    color: "#71717a",
    cursor: "pointer",
    fontSize: 14,
    padding: 2,
  },
  row: {
    display: "flex",
    gap: 8,
    fontSize: 12,
    alignItems: "flex-start",
  },
  rowLabel: {
    color: "#71717a",
    minWidth: 56,
    flexShrink: 0,
  },
  rowValue: {
    color: "#a1a1aa",
  },
  mono: {
    fontFamily: "monospace",
    color: "#a1a1aa",
    wordBreak: "break-all" as const,
    fontSize: 11,
  },
  section: {
    marginTop: 4,
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  },
  sectionLabel: {
    fontSize: 11,
    color: "#71717a",
    marginBottom: 2,
  },
  tag: {
    fontSize: 11,
    fontFamily: "monospace",
    color: "#f87171",
    background: "#1c0a0a",
    border: "1px solid #3f1010",
    borderRadius: 4,
    padding: "2px 6px",
    display: "inline-block",
  },
} as const;
