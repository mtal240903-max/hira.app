import { createContext, useContext, useState, useCallback, useEffect } from "react";
import * as authApi from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Au chargement, on regarde si un token existe déjà (session persistée)
  useEffect(() => {
    const storedUser = localStorage.getItem("hira_user");
    const token = localStorage.getItem("hira_access_token");
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const persistSession = (data) => {
    localStorage.setItem("hira_access_token", data.accessToken);
    localStorage.setItem("hira_refresh_token", data.refreshToken);
    localStorage.setItem("hira_user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const signup = useCallback(async (form) => {
    const data = await authApi.register(form);
    persistSession(data);
    return data.user;
  }, []);

  const login = useCallback(async (form) => {
    const data = await authApi.login(form);
    persistSession(data);
    return data.user;
  }, []);

  const loginWithWuroen = useCallback(async (wuroenToken) => {
    const data = await authApi.loginWithWuroen(wuroenToken);
    persistSession(data);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem("hira_refresh_token");
    try {
      await authApi.logout(refreshToken);
    } catch {
      // On déconnecte localement même si l'appel serveur échoue
    }
    localStorage.removeItem("hira_access_token");
    localStorage.removeItem("hira_refresh_token");
    localStorage.removeItem("hira_user");
    setUser(null);
  }, []);

  // Met à jour le user en mémoire ET dans le stockage local (ex: après modification du profil)
  const updateUser = useCallback((updatedUser) => {
    localStorage.setItem("hira_user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signup, login, loginWithWuroen, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un <AuthProvider>");
  return ctx;
}
