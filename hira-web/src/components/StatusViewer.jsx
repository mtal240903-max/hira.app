import { useState, useEffect, useRef, useCallback } from "react";
import Avatar from "./Avatar";
import * as statusApi from "../api/status";
import "./StatusViewer.css";

const DURATION_MS = 5000;

const ICON_CLOSE = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
  </svg>
);

const ICON_TRASH = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function formatTimeAgo(date) {
  const diffMin = Math.floor((Date.now() - new Date(date)) / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  return `il y a ${Math.floor(diffMin / 60)} h`;
}

export default function StatusViewer({ group, myUserId, onClose, onDeleted }) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);
  const isMine = group.user._id === myUserId;
  const current = group.statuses[index];

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (i + 1 >= group.statuses.length) {
        onClose();
        return i;
      }
      return i + 1;
    });
    setProgress(0);
  }, [group.statuses.length, onClose]);

  const goPrev = () => {
    setIndex((i) => Math.max(0, i - 1));
    setProgress(0);
  };

  // Marque comme vu et fait défiler automatiquement
  useEffect(() => {
    if (!isMine) statusApi.viewStatus(current._id).catch(() => {});

    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / DURATION_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(intervalRef.current);
        goNext();
      }
    }, 50);

    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current._id]);

  const handleDelete = async () => {
    if (!window.confirm("Supprimer ce statut ?")) return;
    await statusApi.deleteStatus(current._id);
    onDeleted(current._id);
    if (group.statuses.length === 1) onClose();
    else goNext();
  };

  return (
    <div className="status-viewer">
      <div className="status-viewer__progress-row">
        {group.statuses.map((s, i) => (
          <div key={s._id} className="status-viewer__progress-track">
            <div
              className="status-viewer__progress-fill"
              style={{ width: i < index ? "100%" : i === index ? `${progress}%` : "0%" }}
            />
          </div>
        ))}
      </div>

      <header className="status-viewer__header">
        <Avatar name={group.user.name} avatarUrl={group.user.avatarUrl} size={36} />
        <div className="status-viewer__author">
          <span className="status-viewer__author-name">{group.user.name}</span>
          <span className="status-viewer__author-time">{formatTimeAgo(current.createdAt)}</span>
        </div>
        {isMine && (
          <button className="status-viewer__icon-btn" onClick={handleDelete} aria-label="Supprimer">
            {ICON_TRASH}
          </button>
        )}
        <button className="status-viewer__icon-btn" onClick={onClose} aria-label="Fermer">
          {ICON_CLOSE}
        </button>
      </header>

      <div className="status-viewer__body">
        <button className="status-viewer__nav status-viewer__nav--prev" onClick={goPrev} aria-label="Précédent" />
        <button className="status-viewer__nav status-viewer__nav--next" onClick={goNext} aria-label="Suivant" />

        {current.type === "text" ? (
          <div className="status-viewer__text-slide" style={{ background: current.backgroundColor }}>
            <p>{current.content}</p>
          </div>
        ) : current.type === "image" ? (
          <img src={current.media?.url} alt="Statut" className="status-viewer__media" />
        ) : (
          <video src={current.media?.url} className="status-viewer__media" autoPlay muted />
        )}

        {current.content && current.type !== "text" && (
          <p className="status-viewer__caption">{current.content}</p>
        )}
      </div>

      {isMine && current.viewers.length > 0 && (
        <div className="status-viewer__viewers">
          👁 {current.viewers.length} vue{current.viewers.length > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
