import { useState } from "react";
import Avatar from "./Avatar";
import Button from "./Button";
import * as conversationsApi from "../api/conversations";
import "./GroupInfoPanel.css";

const ICON_CLOSE = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
  </svg>
);

const ICON_CROWN = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 16 3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5Zm0 2h14v2H5v-2Z" />
  </svg>
);

export default function GroupInfoPanel({ conversation, myUserId, onClose, onUpdated, onLeft }) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(conversation.name || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const myMembership = conversation.members.find((m) => m.user._id === myUserId);
  const isAdmin = myMembership?.role === "admin";

  const handleSaveName = async () => {
    if (!name.trim() || name === conversation.name) {
      setIsEditingName(false);
      return;
    }
    setIsSaving(true);
    try {
      const updated = await conversationsApi.updateGroup(conversation._id, { name: name.trim() });
      onUpdated(updated);
      setIsEditingName(false);
    } catch (err) {
      setError(err.response?.data?.message || "Échec de la mise à jour");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Retirer ce membre du groupe ?")) return;
    try {
      const updated = await conversationsApi.removeGroupMember(conversation._id, userId);
      onUpdated(updated);
    } catch (err) {
      setError(err.response?.data?.message || "Échec du retrait du membre");
    }
  };

  const handleLeave = async () => {
    if (!window.confirm("Quitter ce groupe ? Tu ne recevras plus les messages.")) return;
    try {
      await conversationsApi.leaveGroup(conversation._id);
      onLeft();
    } catch (err) {
      setError(err.response?.data?.message || "Échec pour quitter le groupe");
    }
  };

  return (
    <aside className="group-info">
      <header className="group-info__header">
        <h3>Informations du groupe</h3>
        <button onClick={onClose} aria-label="Fermer" className="group-info__close">
          {ICON_CLOSE}
        </button>
      </header>

      <div className="group-info__identity">
        <Avatar name={conversation.name} avatarUrl={conversation.avatarUrl} size={80} />
        {isEditingName ? (
          <div className="group-info__name-edit">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
            />
            <Button size="sm" onClick={handleSaveName} disabled={isSaving}>OK</Button>
          </div>
        ) : (
          <h2 className="group-info__name" onClick={() => isAdmin && setIsEditingName(true)}>
            {conversation.name} {isAdmin && <span className="group-info__edit-hint">✎</span>}
          </h2>
        )}
        <p className="group-info__count">{conversation.members.length} membres</p>
      </div>

      {error && <p className="auth-error group-info__error">{error}</p>}

      <div className="group-info__members">
        <p className="group-info__section-title">Membres</p>
        {conversation.members.map((m) => (
          <div key={m.user._id} className="group-info__member">
            <Avatar name={m.user.name} avatarUrl={m.user.avatarUrl} size={40} online={m.user.status === "online"} />
            <div className="group-info__member-body">
              <span className="group-info__member-name">
                {m.user.name} {m.user._id === myUserId && "(toi)"}
              </span>
              {m.role === "admin" && (
                <span className="group-info__admin-badge">{ICON_CROWN} Admin</span>
              )}
            </div>
            {isAdmin && m.user._id !== myUserId && (
              <button
                className="group-info__remove"
                onClick={() => handleRemoveMember(m.user._id)}
                aria-label={`Retirer ${m.user.name}`}
              >
                Retirer
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="group-info__footer">
        <Button variant="danger" fullWidth onClick={handleLeave}>
          Quitter le groupe
        </Button>
      </div>
    </aside>
  );
}
