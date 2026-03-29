const items = [
  { color: "#4ade80", label: "Entry point" },
  { color: "#60a5fa", label: "Live file" },
  { color: "#f87171", label: "Dead — nothing imports this" },
];

export function Legend() {
  return (
    <div style={styles.root}>
      {items.map(({ color, label }) => (
        <div key={label} style={styles.item}>
          <div style={{ ...styles.dot, background: color }} />
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
    background: "#111111",
    border: "1px solid #27272a",
    borderRadius: 6,
    padding: "8px 12px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
    zIndex: 10,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  label: {
    fontSize: 11,
    color: "#a1a1aa",
  },
} as const;
