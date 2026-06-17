export default function ExternalLink({ href, label = "Ouvrir la référence", color = "#2f79ff" }) {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        marginBottom: 12,
        fontSize: 12,
        fontWeight: 600,
        color,
        textDecoration: "none",
      }}
    >
      <span style={{ fontSize: 11 }}>↗</span>
      {label}
    </a>
  );
}
