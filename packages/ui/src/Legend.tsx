const items = [
  { color: "#4ade80", label: "Entry point" },
  { color: "#3b82f6", label: "Live module" },
  { color: "#ef4444", label: "Dead code" },
];

export function Legend() {
  return (
    <div style={styles.root}>
      {items.map(({ color, label }) => (
        <div key={label} style={styles.item}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: color,
              boxShadow: `0 0 6px ${color}40`,
              flexShrink: 0,
            }}
          />
          <span style={styles.label}>{label}</span>
        </div>
      ))}
    </div>
  );
}

const styles = {
  root: {
    position: "absolute" as const,
    bottom: 16,
    left: 16,
    background: "rgba(28, 28, 30, 0.85)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid #2a2a2a",
    borderRadius: 10,
    padding: "10px 14px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
    zIndex: 10,
    boxShadow: "0 1px 2px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.3)",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: 500,
    color: "#888",
    fontFamily: "'Geist', system-ui, sans-serif",
    letterSpacing: "0.01em",
  },
} as const;
