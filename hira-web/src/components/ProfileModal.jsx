import { useState, useRef } from "react";
import Avatar from "./Avatar";
import Input from "./Input";
import Button from "./Button";
import * as usersApi from "../api/users";
import * as mediaApi from "../api/media";
import "./ProfileModal.css";

export default function ProfileModal({ user, onClose, onUpdated }) {
  const [name, setName] = useState(user.name || "");
  const [bio, setBio] = useState(user.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError("");
    try {
      const { media } = await mediaApi.uploadMedia(file);
      setAvatarUrl(media.url);
    } catch (err) {
      setError(err.response?.data?.message || "Échec de l'upload de la photo");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    try {
      const updatedUser = await usersApi.updateProfile({ name, bio, avatarUrl });
      onUpdated(updatedUser);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Échec de la mise à jour du profil");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal__header">
          <h3>Mon profil</h3>
          <button className="modal-card__close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="profile-modal__avatar-zone">
          <button className="profile-modal__avatar-btn" onClick={handleAvatarClick} disabled={isUploading}>
            <Avatar name={name} avatarUrl={avatarUrl} size={88} />
            <span className="profile-modal__avatar-overlay">{isUploading ? "..." : "Modifier"}</span>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
        </div>

        <div className="profile-modal__form">
          <Input id="profile-name" label="Nom" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
          <div className="hira-field">
            <label htmlFor="profile-bio" className="hira-field__label">Bio</label>
            <textarea
              id="profile-bio"
              className="profile-modal__textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={150}
              rows={3}
              placeholder="Parle un peu de toi..."
            />
            <span className="profile-modal__counter">{bio.length}/150</span>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <Button fullWidth onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
