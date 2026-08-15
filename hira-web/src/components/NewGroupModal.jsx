import { useState, useRef } from "react";
import Avatar from "./Avatar";
import Button from "./Button";
import * as conversationsApi from "../api/conversations";
import "./NewGroupModal.css";

export default function NewGroupModal({ onClose, onCreated }) {
  const [step, setStep] = useState("members"); // "members" | "details"
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]); // liste d'objets user
  const [groupName, setGroupName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef(null);

  const handleQueryChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const users = await conversationsApi.searchUsers(value.trim());
        setResults(users);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const toggleUser = (u) => {
    setSelected((prev) =>
      prev.some((s) => s.id === u.id) ? prev.filter((s) => s.id !== u.id) : [...prev, u]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selected.length === 0) return;
    setIsCreating(true);
    setError("");
    try {
      const conversation = await conversationsApi.createGroup(
        groupName.trim(),
        selected.map((u) => u.id)
      );
      onCreated(conversation);
    } catch (err) {
      setError(err.response?.data?.message || "Échec de la création du groupe");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__header">
          <h3>Nouveau groupe</h3>
          <button className="modal-card__close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {step === "members" ? (
          <>
            <input
              className="modal-card__search"
              placeholder="Rechercher des membres..."
              value={query}
              onChange={handleQueryChange}
              autoFocus
            />

            {selected.length > 0 && (
              <div className="new-group__chips">
                {selected.map((u) => (
                  <span key={u.id} className="new-group__chip" onClick={() => toggleUser(u)}>
                    {u.name} ✕
                  </span>
                ))}
              </div>
            )}

            <div className="modal-card__results">
              {isSearching && <p className="modal-card__hint">Recherche...</p>}
              {!isSearching && query.trim().length >= 2 && results.length === 0 && (
                <p className="modal-card__hint">Aucun utilisateur trouvé.</p>
              )}
              {results.map((u) => {
                const isSelected = selected.some((s) => s.id === u.id);
                return (
                  <button
                    key={u.id}
                    className={`modal-card__result ${isSelected ? "modal-card__result--selected" : ""}`}
                    onClick={() => toggleUser(u)}
                  >
                    <Avatar name={u.name} avatarUrl={u.avatarUrl} size={40} />
                    <div>
                      <p className="modal-card__result-name">{u.name}</p>
                      <p className="modal-card__result-sub">{u.email || u.phone}</p>
                    </div>
                    {isSelected && <span className="new-group__check">✓</span>}
                  </button>
                );
              })}
            </div>

            <div className="new-group__footer">
              <Button fullWidth disabled={selected.length === 0} onClick={() => setStep("details")}>
                Continuer ({selected.length} sélectionné{selected.length > 1 ? "s" : ""})
              </Button>
            </div>
          </>
        ) : (
          <div className="new-group__details">
            <input
              className="modal-card__search"
              placeholder="Nom du groupe"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={100}
              autoFocus
            />
            <p className="new-group__members-label">{selected.length} membre{selected.length > 1 ? "s" : ""}</p>
            <div className="new-group__members-list">
              {selected.map((u) => (
                <div key={u.id} className="new-group__member">
                  <Avatar name={u.name} avatarUrl={u.avatarUrl} size={36} />
                  <span>{u.name}</span>
                </div>
              ))}
            </div>

            {error && <p className="auth-error">{error}</p>}

            <div className="new-group__footer new-group__footer--split">
              <Button variant="secondary" onClick={() => setStep("members")}>Retour</Button>
              <Button disabled={!groupName.trim() || isCreating} onClick={handleCreate}>
                {isCreating ? "Création..." : "Créer le groupe"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
