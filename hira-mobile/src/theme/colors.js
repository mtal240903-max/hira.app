// Palette dérivée du logo Hira — dégradé cyan → bleu → violet sur fond bleu nuit.
// Miroir du système de design web (src/index.css), adapté en objets JS
// puisque React Native n'a pas de variables CSS.

export const darkTheme = {
  name: "dark",
  bgApp: "#0a0e1a",
  bgSurface: "#12172a",
  bgSurfaceRaised: "#171d33",
  bgHover: "#1d2440",
  bgActive: "#232b4d",

  textPrimary: "#f5f7fa",
  textSecondary: "#8b92a8",
  textTertiary: "#5a6178",

  borderSubtle: "#1f2540",
  borderDefault: "#2a3155",

  bubbleOutStart: "#2563eb",
  bubbleOutEnd: "#7c3aed",
  bubbleOutText: "#ffffff",
  bubbleIn: "#1a2038",
  bubbleInText: "#f5f7fa",

  success: "#22c55e",
  danger: "#ef4444",
};

export const lightTheme = {
  name: "light",
  bgApp: "#f7f8fc",
  bgSurface: "#ffffff",
  bgSurfaceRaised: "#ffffff",
  bgHover: "#f0f2fa",
  bgActive: "#e7eaf7",

  textPrimary: "#12172a",
  textSecondary: "#5a6178",
  textTertiary: "#8b92a8",

  borderSubtle: "#e6e8f2",
  borderDefault: "#d8dcec",

  bubbleOutStart: "#3b82f6",
  bubbleOutEnd: "#a855f7",
  bubbleOutText: "#ffffff",
  bubbleIn: "#eef0f8",
  bubbleInText: "#12172a",

  success: "#16a34a",
  danger: "#dc2626",
};

// Couleurs de marque, identiques dans les deux thèmes
export const BRAND = {
  cyan: "#22d3ee",
  blue: "#3b82f6",
  violet: "#a855f7",
  gradient: ["#22d3ee", "#3b82f6", "#a855f7"],
};

export const radius = { sm: 8, md: 14, lg: 20, full: 999 };
