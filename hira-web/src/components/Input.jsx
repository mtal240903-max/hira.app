import "./Input.css";

export default function Input({ label, error, id, ...rest }) {
  return (
    <div className="hira-field">
      {label && (
        <label htmlFor={id} className="hira-field__label">
          {label}
        </label>
      )}
      <input id={id} className={`hira-field__input ${error ? "hira-field__input--error" : ""}`} {...rest} />
      {error && <span className="hira-field__error">{error}</span>}
    </div>
  );
}
