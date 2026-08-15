import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/hira-logo.png";
import "./AuthPage.css";

export default function WuroenCallbackPage() {
  const [error, setError] = useState("");
  const { loginWithWuroen } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const wuroenError = params.get("error");

    if (wuroenError) {
      setError("Connexion Wuro'en annulée ou refusée.");
      return;
    }
    if (!token) {
      setError("Aucun token reçu de Wuro'en.");
      return;
    }

    loginWithWuroen(token)
      .then(() => navigate("/", { replace: true }))
      .catch((err) => {
        setError(err.response?.data?.message || "Échec de la connexion via Wuro'en.");
      });
  }, [loginWithWuroen, navigate]);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <img src={logo} alt="Hira" className="auth-brand__logo" style={{ margin: "0 auto 16px" }} />
        {error ? (
          <>
            <p className="auth-error">{error}</p>
            <button className="hira-btn hira-btn--secondary hira-btn--md" onClick={() => navigate("/login")}>
              Retour à la connexion
            </button>
          </>
        ) : (
          <p style={{ color: "var(--text-secondary)" }}>Connexion à Hira via Wuro'en...</p>
        )}
      </div>
    </div>
  );
}
