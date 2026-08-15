import "./TypingIndicator.css";

export default function TypingIndicator({ name }) {
  return (
    <div className="typing-indicator">
      <span className="typing-indicator__dot" />
      <span className="typing-indicator__dot" />
      <span className="typing-indicator__dot" />
      {name && <span className="typing-indicator__label">{name} écrit...</span>}
    </div>
  );
}
