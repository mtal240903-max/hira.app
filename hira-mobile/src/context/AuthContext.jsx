import { createContext, useContext, useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as authApi from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [storedUser, token] = await Promise.all([
        AsyncStorage.getItem("hira_user"),
        AsyncStorage.getItem("hira_access_token"),
      ]);
      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
      }
      setIsLoading(false);
    })();
  }, []);

  const persistSession = async (data) => {
    await AsyncStorage.setItem("hira_access_token", data.accessToken);
    await AsyncStorage.setItem("hira_refresh_token", data.refreshToken);
    await AsyncStorage.setItem("hira_user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const signup = useCallback(async (form) => {
    const data = await authApi.register(form);
    await persistSession(data);
    return data.user;
  }, []);

  const login = useCallback(async (form) => {
    const data = await authApi.login(form);
    await persistSession(data);
    return data.user;
  }, []);

  const loginWithWuroen = useCallback(async (wuroenToken) => {
    const data = await authApi.loginWithWuroen(wuroenToken);
    await persistSession(data);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = await AsyncStorage.getItem("hira_refresh_token");
    try {
      await authApi.logout(refreshToken);
    } catch {
      // On déconnecte localement même si l'appel serveur échoue
    }
    await AsyncStorage.multiRemove(["hira_access_token", "hira_refresh_token", "hira_user"]);
    setUser(null);
  }, []);

  const updateUser = useCallback(async (updatedUser) => {
    await AsyncStorage.setItem("hira_user", JSON.stringify(updatedUser));
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
