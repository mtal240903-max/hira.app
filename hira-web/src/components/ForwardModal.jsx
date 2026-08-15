import { useState } from "react";
import Avatar from "./Avatar";
import "./ForwardModal.css";

function getConversationDisplay(conversation, myUserId) {
  if (conversation.type === "group") {
    return { name: conversation.name, avatarUrl: conversation.avatarUrl };
  }
  const other = conversation.members.find((m) => m.user._id !== myUserId)?.user;
  return { name: other?.name || "Utilisateur", avatarUrl: other?.avatarUrl };
}

export default function ForwardModal({ conversations, myUserId, message, onClose, onForward }) {
  const [sentTo, setSentTo] = useState(new Set());

  const handleForward = (conv) => {
    onForward(conv, message);
    setSentTo((prev) => new Set(prev).add(conv._id));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__header">
          <h3>Transférer le message</h3>
          <button className="modal-card__close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="forward-modal__preview">
          {message.type === "text" ? message.content : `📎 ${message.type}`}
        </div>

        <div className="modal-card__results">
          {conversations.map((conv) => {
            const { name, avatarUrl } = getConversationDisplay(conv, myUserId);
            const isSent = sentTo.has(conv._id);
            return (
              <button
                key={conv._id}
                className="modal-card__result"
                onClick={() => !isSent && handleForward(conv)}
                disabled={isSent}
              >
                <Avatar name={name} avatarUrl={avatarUrl} size={40} />
                <p className="modal-card__result-name">{name}</p>
                {isSent && <span className="forward-modal__sent">Envoyé ✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
