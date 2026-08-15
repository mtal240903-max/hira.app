import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";
import Input from "../components/Input";
import logo from "../assets/hira-logo.png";
import "./AuthPage.css";

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [form, setForm] = useState({ name: "", identifier: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const isSignup = mode === "signup";

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  // Redirige vers Wuro'en, qui renverra automatiquement l'utilisateur
  // sur /auth/wuroen/callback?token=... une fois connecté côté Wuro'en
  const handleWuroenRedirect = () => {
    const wuroenConnectUrl = import.meta.env.VITE_WUROEN_CONNECT_URL || "https://wuroen-app.onrender.com/api/auth/connect";
    const redirectUri = `${window.location.origin}/auth/wuroen/callback`;
    window.location.href = `${wuroenConnectUrl}?redirect_uri=${encodeURIComponent(redirectUri)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (isSignup) {
        // identifier sert d'email OU téléphone selon ce que l'utilisateur tape
        const isEmail = form.identifier.includes("@");
        await signup({
          name: form.name,
          password: form.password,
          email: isEmail ? form.identifier : undefined,
          phone: isEmail ? undefined : form.identifier,
        });
      } else {
        await login({ identifier: form.identifier, password: form.password });
      }
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Une erreur est survenue, réessaie.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <img src={logo} alt="Hira" className="auth-brand__logo" />
          <p className="auth-brand__tagline">Discutez sans limites</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tabs__item ${!isSignup ? "auth-tabs__item--active" : ""}`}
            onClick={() => setMode("login")}
            type="button"
          >
            Connexion
          </button>
          <button
            className={`auth-tabs__item ${isSignup ? "auth-tabs__item--active" : ""}`}
            onClick={() => setMode("signup")}
            type="button"
          >
            Créer un compte
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignup && (
            <Input
              id="name"
              label="Nom"
              placeholder="Ton nom complet"
              value={form.name}
              onChange={handleChange("name")}
              required
            />
          )}

          <Input
            id="identifier"
            label="Email ou téléphone"
            placeholder="toi@exemple.com ou +229..."
            value={form.identifier}
            onChange={handleChange("identifier")}
            required
          />

          <Input
            id="password"
            label="Mot de passe"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange("password")}
            required
            minLength={6}
          />

          {error && <p className="auth-error">{error}</p>}

          <Button type="submit" fullWidth disabled={isSubmitting}>
            {isSubmitting ? "Un instant..." : isSignup ? "Créer mon compte" : "Se connecter"}
          </Button>
        </form>

        <div className="auth-divider">
          <span>ou</span>
        </div>

        <Button variant="secondary" fullWidth onClick={handleWuroenRedirect}>
          Continuer avec Wuro'en
        </Button>
      </div>
    </div>
  );
}
