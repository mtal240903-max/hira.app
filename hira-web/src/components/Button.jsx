import "./Button.css";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  type = "button",
  onClick,
  ...rest
}) {
  return (
    <button
      type={type}
      className={`hira-btn hira-btn--${variant} hira-btn--${size} ${fullWidth ? "hira-btn--full" : ""}`}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
