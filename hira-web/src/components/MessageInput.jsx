import { useState, useRef, useCallback } from "react";
import Button from "./Button";
import EmojiPicker from "./EmojiPicker";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import "./MessageInput.css";

const ICON_SEND = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 2 11 13" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M22 2 15 22l-4-9-9-4 20-7Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ICON_ATTACH = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path
      d="M21.44 11.05 12.25 20.24a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95L9.41 17.41a1.5 1.5 0 0 1-2.12-2.12l8.49-8.48"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ICON_EMOJI = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ICON_MIC = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ICON_TRASH = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const sec = String(totalSec % 60).padStart(2, "0");
  return `${min}:${sec}`;
}

export default function MessageInput({ onSend, onTypingStart, onTypingStop, replyTo, onCancelReply, onFileSelect, onVoiceRecorded }) {
  const [text, setText] = useState("");
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const typingTimeout = useRef(null);
  const textareaRef = useRef(null);
  const { isRecording, durationMs, start, stop } = useVoiceRecorder();

  const handleChange = (e) => {
    setText(e.target.value);
    onTypingStart?.();
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTypingStop?.(), 1500);
  };

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const trimmed = text.trim();
      if (!trimmed) return;
      onSend(trimmed);
      setText("");
      clearTimeout(typingTimeout.current);
      onTypingStop?.();
    },
    [text, onSend, onTypingStop]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setText((t) => t + emoji);
    textareaRef.current?.focus();
  };

  const handleMicClick = async () => {
    if (!isRecording) {
      try {
        await start();
      } catch {
        alert("Impossible d'accéder au micro. Vérifie les autorisations de ton navigateur.");
      }
    } else {
      const file = await stop(false);
      if (file) onVoiceRecorded?.(file);
    }
  };

  const handleCancelRecording = async () => {
    await stop(true);
  };

  return (
    <form className="msg-input" onSubmit={handleSubmit}>
      {replyTo && (
        <div className="msg-input__reply-preview">
          <div>
            <span className="msg-input__reply-author">{replyTo.sender?.name}</span>
            <p className="msg-input__reply-text">{replyTo.isDeleted ? "Message supprimé" : replyTo.content}</p>
          </div>
          <button type="button" className="msg-input__reply-cancel" onClick={onCancelReply} aria-label="Annuler la réponse">
            ✕
          </button>
        </div>
      )}
      <div className="msg-input__row">
        {isRecording ? (
          <div className="msg-input__recording">
            <button type="button" className="msg-input__recording-cancel" onClick={handleCancelRecording} aria-label="Annuler">
              {ICON_TRASH}
            </button>
            <span className="msg-input__recording-dot" />
            <span className="msg-input__recording-time">{formatDuration(durationMs)}</span>
            <span className="msg-input__recording-hint">Enregistrement...</span>
          </div>
        ) : (
          <>
            <div className="msg-input__emoji-wrap">
              <button
                type="button"
                className="msg-input__attach"
                onClick={() => setIsEmojiOpen((v) => !v)}
                aria-label="Emojis"
              >
                {ICON_EMOJI}
              </button>
              {isEmojiOpen && (
                <>
                  <div className="msg-input__emoji-backdrop" onClick={() => setIsEmojiOpen(false)} />
                  <EmojiPicker
                    onSelect={(e) => {
                      handleEmojiSelect(e);
                      setIsEmojiOpen(false);
                    }}
                  />
                </>
              )}
            </div>

            <label className="msg-input__attach" aria-label="Joindre un fichier">
              {ICON_ATTACH}
              <input type="file" hidden onChange={onFileSelect} />
            </label>

            <textarea
              ref={textareaRef}
              className="msg-input__textarea"
              placeholder="Écris un message..."
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              rows={1}
            />
          </>
        )}

        {text.trim() ? (
          <Button type="submit" variant="primary" size="icon">
            {ICON_SEND}
          </Button>
        ) : (
          <Button
            type="button"
            variant={isRecording ? "danger" : "primary"}
            size="icon"
            onClick={handleMicClick}
          >
            {ICON_MIC}
          </Button>
        )}
      </div>
    </form>
  );
}
