import { View, Text, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";
import { BRAND } from "../theme/colors";

function colorFromName(name = "") {
  const colors = ["#3b82f6", "#a855f7", "#22d3ee", "#f97316", "#ec4899", "#14b8a6"];
  return colors[(name.charCodeAt(0) || 0) % colors.length];
}

export default function Avatar({ name, avatarUrl, size = 44, online = false }) {
  const { theme } = useTheme();
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const inner = (
    <View
      style={[
        styles.inner,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.bgHover,
          borderColor: theme.bgSurface,
          borderWidth: online ? 2 : 0,
        },
      ]}
    >
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={{ width: "100%", height: "100%", borderRadius: size / 2 }} />
      ) : (
        <View
          style={[
            styles.fallback,
            { backgroundColor: colorFromName(name), borderRadius: size / 2 },
          ]}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: size * 0.36 }}>{initials}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={{ width: size, height: size }}>
      {online ? (
        <LinearGradient
          colors={BRAND.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: size, height: size, borderRadius: size / 2, padding: 2 }}
        >
          {inner}
        </LinearGradient>
      ) : (
        inner
      )}
      {online && (
        <View
          style={[
            styles.dot,
            { backgroundColor: theme.success, borderColor: theme.bgApp },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inner: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
});
