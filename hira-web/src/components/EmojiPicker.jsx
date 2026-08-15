import "./EmojiPicker.css";

const EMOJI_GROUPS = {
  "Fréquents": ["😀", "😂", "❤️", "👍", "🙏", "😍", "😊", "🔥"],
  "Émotions": ["😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😉", "😎", "🥳", "😢", "😭", "😡", "😱", "🥺", "😴"],
  "Gestes": ["👍", "👎", "👏", "🙌", "🙏", "👋", "✌️", "🤝", "💪", "👌"],
  "Cœurs": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💔", "💕", "💯"],
  "Objets": ["🔥", "✨", "🎉", "🎂", "📷", "🎵", "⚽", "🍕", "☕", "🌍"],
};

export default function EmojiPicker({ onSelect }) {
  return (
    <div className="emoji-picker">
      {Object.entries(EMOJI_GROUPS).map(([label, emojis]) => (
        <div key={label} className="emoji-picker__group">
          <p className="emoji-picker__label">{label}</p>
          <div className="emoji-picker__grid">
            {emojis.map((e, i) => (
              <button key={`${label}-${i}`} className="emoji-picker__emoji" onClick={() => onSelect(e)}>
                {e}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
