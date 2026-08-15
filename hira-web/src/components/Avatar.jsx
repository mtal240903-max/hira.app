import "./Avatar.css";

// Génère une couleur de fond stable à partir du nom, pour les avatars sans photo
function colorFromName(name = "") {
  const colors = ["#3b82f6", "#a855f7", "#22d3ee", "#f97316", "#ec4899", "#14b8a6"];
  const index = name.charCodeAt(0) % colors.length || 0;
  return colors[index];
}

export default function Avatar({ name, avatarUrl, size = 44, online = false }) {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className={`hira-avatar ${online ? "hira-avatar--online" : ""}`} style={{ width: size, height: size }}>
      <div className="hira-avatar__inner" style={{ width: size, height: size }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="hira-avatar__img" />
        ) : (
          <div
            className="hira-avatar__fallback"
            style={{ background: colorFromName(name), fontSize: size * 0.38 }}
          >
            {initials}
          </div>
        )}
      </div>
      {online && <span className="hira-avatar__dot" aria-label="En ligne" />}
    </div>
  );
}
