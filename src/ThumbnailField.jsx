export default function ThumbnailField({ value, accentColor = "#94a3b8" }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
          borderRadius: 8,
          overflow: "hidden",
          background: "#f1f5f9",
          border: `1px dashed ${value ? "transparent" : accentColor + "55"}`,
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {value ? (
          <img
            src={value}
            alt="Miniature"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Aucune miniature</span>
        )}
      </div>
    </div>
  );
}
