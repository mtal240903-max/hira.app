import Avatar from "./Avatar";
import "./ConversationList.css";

function getConversationDisplay(conversation, myUserId) {
  if (conversation.type === "group") {
    return { name: conversation.name, avatarUrl: conversation.avatarUrl, online: false };
  }
  const other = conversation.members.find((m) => m.user._id !== myUserId)?.user;
  return {
    name: other?.name || "Utilisateur",
    avatarUrl: other?.avatarUrl,
    online: other?.status === "online",
  };
}

function formatPreview(message) {
  if (!message) return "Aucun message";
  if (message.isDeleted) return "Message supprimé";
  if (message.type === "text") return message.content;
  const labels = { image: "📷 Photo", video: "🎬 Vidéo", audio: "🎤 Message vocal", document: "📄 Document" };
  return labels[message.type] || "Message";
}

function formatTime(date) {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export default function ConversationList({ conversations, activeId, onSelect, myUserId }) {
  if (conversations.length === 0) {
    return (
      <div className="conv-empty">
        <p>Aucune conversation pour l'instant.</p>
        <p className="conv-empty__hint">Recherche un contact pour démarrer une discussion.</p>
      </div>
    );
  }

  return (
    <ul className="conv-list">
      {conversations.map((conv) => {
        const { name, avatarUrl, online } = getConversationDisplay(conv, myUserId);
        const isActive = conv._id === activeId;
        return (
          <li key={conv._id}>
            <button
              className={`conv-item ${isActive ? "conv-item--active" : ""}`}
              onClick={() => onSelect(conv)}
            >
              <Avatar name={name} avatarUrl={avatarUrl} online={online} size={48} />
              <div className="conv-item__body">
                <div className="conv-item__top">
                  <span className="conv-item__name">{name}</span>
                  <span className="conv-item__time">{formatTime(conv.lastMessageAt)}</span>
                </div>
                <p className="conv-item__preview">{formatPreview(conv.lastMessage)}</p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
