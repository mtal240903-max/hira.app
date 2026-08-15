import "./MessageBubble.css";

function formatTime(date) {
  return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({ message, isMine }) {
  const isDeleted = message.isDeleted;

  return (
    <div className={`msg-row ${isMine ? "msg-row--mine" : ""}`}>
      <div className={`msg-bubble ${isMine ? "msg-bubble--mine" : "msg-bubble--theirs"} ${isDeleted ? "msg-bubble--deleted" : ""}`}>
        {message.replyTo && !isDeleted && (
          <div className="msg-bubble__reply">
            <span className="msg-bubble__reply-author">{message.replyTo.sender?.name || "Message"}</span>
            <span className="msg-bubble__reply-text">
              {message.replyTo.isDeleted ? "Message supprimé" : message.replyTo.content}
            </span>
          </div>
        )}

        {isDeleted ? (
          <p className="msg-bubble__text msg-bubble__text--italic">Message supprimé</p>
        ) : message.type === "text" ? (
          <p className="msg-bubble__text">{message.content}</p>
        ) : message.type === "image" ? (
          <img src={message.media?.url} alt="Image envoyée" className="msg-bubble__media-img" />
        ) : message.type === "video" ? (
          <video src={message.media?.url} controls className="msg-bubble__media-img" />
        ) : message.type === "audio" ? (
          <audio src={message.media?.url} controls className="msg-bubble__audio" />
        ) : (
          <a href={message.media?.url} target="_blank" rel="noreferrer" className="msg-bubble__doc">
            📄 {message.media?.fileName || "Document"}
          </a>
        )}

        <div className="msg-bubble__meta">
          {message.isEdited && !isDeleted && <span className="msg-bubble__edited">modifié</span>}
          <span className="msg-bubble__time">{formatTime(message.createdAt)}</span>
        </div>

        {message.reactions?.length > 0 && (
          <div className="msg-bubble__reactions">
            {message.reactions.map((r, i) => (
              <span key={i} className="msg-bubble__reaction">{r.emoji}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
