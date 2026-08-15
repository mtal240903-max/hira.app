import { useState, useRef } from "react";
import Button from "./Button";
import * as statusApi from "../api/status";
import * as mediaApi from "../api/media";
import "./CreateStatusModal.css";

const COLORS = ["#3B82F6", "#A855F7", "#22D3EE", "#F97316", "#EC4899", "#14B8A6", "#EF4444", "#0A0E1A"];

export default function CreateStatusModal({ onClose, onCreated }) {
  const [mode, setMode] = useState(null); // null | "text" | "media"
  const [text, setText] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const previewUrl = file ? URL.createObjectURL(file) : null;

  const handlePickMedia = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setMode("media");
    }
  };

  const handlePost = async () => {
    setIsPosting(true);
    setError("");
    try {
      if (mode === "text") {
        if (!text.trim()) return;
        const status = await statusApi.createStatus({ type: "text", content: text.trim(), backgroundColor: color });
        onCreated(status);
      } else if (mode === "media" && file) {
        const { category, media } = await mediaApi.uploadMedia(file);
        if (category !== "image" && category !== "video") {
          throw new Error("Seules les images et vidéos sont acceptées pour un statut");
        }
        const status = await statusApi.createStatus({ type: category, content: caption.trim(), media });
        onCreated(status);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Échec de la publication");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-status" onClick={(e) => e.stopPropagation()}>
        <div className="create-status__header">
          <h3>Nouveau statut</h3>
          <button className="modal-card__close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {!mode && (
          <div className="create-status__choices">
            <button className="create-status__choice" onClick={() => setMode("text")}>
              <span className="create-status__choice-icon" style={{ background: "var(--hira-gradient)" }}>Aa</span>
              Statut texte
            </button>
            <button className="create-status__choice" onClick={handlePickMedia}>
              <span className="create-status__choice-icon">📷</span>
              Photo ou vidéo
            </button>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" hidden onChange={handleFileChange} />
          </div>
        )}

        {mode === "text" && (
          <>
            <div className="create-status__preview" style={{ background: color }}>
              <textarea
                className="create-status__text-input"
                placeholder="Écris quelque chose..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={500}
                autoFocus
              />
            </div>
            <div className="create-status__colors">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`create-status__color ${color === c ? "create-status__color--active" : ""}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Couleur ${c}`}
                />
              ))}
            </div>
          </>
        )}

        {mode === "media" && file && (
          <>
            <div className="create-status__preview">
              {file.type.startsWith("image/") ? (
                <img src={previewUrl} alt="Aperçu" className="create-status__media-preview" />
              ) : (
                <video src={previewUrl} className="create-status__media-preview" controls muted />
              )}
            </div>
            <input
              className="create-status__caption"
              placeholder="Ajouter une légende (optionnel)..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </>
        )}

        {error && <p className="auth-error create-status__error">{error}</p>}

        {mode && (
          <div className="create-status__footer">
            <Button variant="secondary" onClick={() => { setMode(null); setFile(null); }} disabled={isPosting}>
              Retour
            </Button>
            <Button onClick={handlePost} disabled={isPosting || (mode === "text" && !text.trim())}>
              {isPosting ? "Publication..." : "Publier"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
