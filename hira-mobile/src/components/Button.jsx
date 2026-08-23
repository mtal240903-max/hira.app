import { Pressable, Text, ActivityIndicator, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";
import { BRAND, radius } from "../theme/colors";

export default function Button({
  children,
  variant = "primary",
  onPress,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}) {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;

  const content = (
    <>
      {loading && <ActivityIndicator color={variant === "primary" ? "#fff" : theme.textPrimary} style={{ marginRight: 8 }} />}
      <Text
        style={[
          styles.text,
          {
            color:
              variant === "primary"
                ? "#ffffff"
                : variant === "danger"
                ? theme.danger
                : theme.textPrimary,
          },
        ]}
      >
        {children}
      </Text>
    </>
  );

  const baseStyle = [
    styles.base,
    fullWidth && { width: "100%" },
    isDisabled && { opacity: 0.5 },
    style,
  ];

  if (variant === "primary") {
    return (
      <Pressable onPress={onPress} disabled={isDisabled} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
        <LinearGradient colors={BRAND.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={baseStyle}>
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        baseStyle,
        variant === "secondary" && { backgroundColor: theme.bgHover, borderWidth: 1, borderColor: theme.borderDefault },
        pressed && { opacity: 0.7 },
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: radius.md,
  },
  text: {
    fontWeight: "700",
    fontSize: 15,
  },
});
