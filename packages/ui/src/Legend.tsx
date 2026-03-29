const items = [
  { color: "#4ade80", label: "Entry point" },
  { color: "#3b82f6", label: "Live module" },
  { color: "#ef4444", label: "Dead code" },
];

interface LegendProps {
  isDark: boolean;
}

export function Legend({ isDark }: LegendProps) {
  return (
    <div
      style={{
        ...styles.root,
        background: isDark ? "rgba(28, 28, 30, 0.85)" : "rgba(255, 255, 255, 0.88)",
        border: `1px solid ${isDark ? "#2a2a2a" : "#e0e0e4"}`,
        boxShadow: isDark
          ? "0 1px 2px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.3)"
          : "0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)",
      }}
    >
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
          <span style={{ ...styles.label, color: isDark ? "#888" : "#555" }}>{label}</span>
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
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    borderRadius: 10,
    padding: "10px 14px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
    zIndex: 10,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: 500,
    fontFamily: "'Geist', system-ui, sans-serif",
    letterSpacing: "0.01em",
  },
} as const;
