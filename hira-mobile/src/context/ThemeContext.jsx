import { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkTheme, lightTheme } from "../theme/colors";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState("dark");

  useEffect(() => {
    AsyncStorage.getItem("hira_theme").then((stored) => {
      if (stored) setThemeName(stored);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeName((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      AsyncStorage.setItem("hira_theme", next);
      return next;
    });
  }, []);

  const theme = themeName === "dark" ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, themeName, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme doit être utilisé dans un <ThemeProvider>");
  return ctx;
}
