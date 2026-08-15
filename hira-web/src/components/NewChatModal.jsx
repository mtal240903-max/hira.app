import { useState, useCallback, useRef } from "react";
import Avatar from "./Avatar";
import * as conversationsApi from "../api/conversations";
import "./NewChatModal.css";

export default function NewChatModal({ onClose, onSelectUser }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef(null);

  const handleChange = (e) => {
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__header">
          <h3>Nouvelle discussion</h3>
          <button className="modal-card__close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <input
          className="modal-card__search"
          placeholder="Rechercher par nom, email ou téléphone..."
          value={query}
          onChange={handleChange}
          autoFocus
        />

        <div className="modal-card__results">
          {isSearching && <p className="modal-card__hint">Recherche...</p>}
          {!isSearching && query.trim().length >= 2 && results.length === 0 && (
            <p className="modal-card__hint">Aucun utilisateur trouvé.</p>
          )}
          {results.map((u) => (
            <button key={u.id} className="modal-card__result" onClick={() => onSelectUser(u)}>
              <Avatar name={u.name} avatarUrl={u.avatarUrl} size={40} />
              <div>
                <p className="modal-card__result-name">{u.name}</p>
                <p className="modal-card__result-sub">{u.email || u.phone}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
