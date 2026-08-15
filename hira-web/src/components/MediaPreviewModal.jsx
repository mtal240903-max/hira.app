import { useState, useMemo } from "react";
import Button from "./Button";
import "./MediaPreviewModal.css";

function getFileCategory(mimeType) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

export default function MediaPreviewModal({ file, onCancel, onConfirm, isSending }) {
  const [caption, setCaption] = useState("");
  const category = getFileCategory(file.type);
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="media-preview" onClick={(e) => e.stopPropagation()}>
        <div className="media-preview__header">
          <h3>Envoyer {category === "image" ? "une image" : category === "video" ? "une vidéo" : "un fichier"}</h3>
          <button className="modal-card__close" onClick={onCancel} aria-label="Annuler">✕</button>
        </div>

        <div className="media-preview__body">
          {category === "image" && <img src={previewUrl} alt="Aperçu" className="media-preview__image" />}
          {category === "video" && <video src={previewUrl} controls className="media-preview__image" />}
          {category === "audio" && <audio src={previewUrl} controls className="media-preview__audio" />}
          {category === "document" && (
            <div className="media-preview__file">
              <span className="media-preview__file-icon">📄</span>
              <div>
                <p className="media-preview__file-name">{file.name}</p>
                <p className="media-preview__file-size">{(file.size / 1024).toFixed(0)} Ko</p>
              </div>
            </div>
          )}
        </div>

        <input
          className="media-preview__caption"
          placeholder="Ajouter une légende (optionnel)..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          disabled={isSending}
        />

        <div className="media-preview__footer">
          <Button variant="secondary" onClick={onCancel} disabled={isSending}>Annuler</Button>
          <Button onClick={() => onConfirm(caption)} disabled={isSending}>
            {isSending ? "Envoi..." : "Envoyer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
