import { View, Text, Pressable, StyleSheet } from "react-native";
import Avatar from "./Avatar";
import { useCall } from "../context/CallContext";
import { useTheme } from "../context/ThemeContext";
import { radius } from "../theme/colors";

export default function IncomingCallBanner() {
  const { callStatus, callInfo, acceptCall, rejectCall } = useCall();
  const { theme } = useTheme();

  if (callStatus !== "ringing") return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.bgSurfaceRaised, borderColor: theme.borderDefault }]}>
      <Avatar name={callInfo.name} avatarUrl={callInfo.avatarUrl} size={48} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.textPrimary, fontWeight: "700" }}>{callInfo.name}</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
          Appel {callInfo.callType === "video" ? "vidéo" : "audio"} entrant...
        </Text>
      </View>
      <Pressable onPress={rejectCall} style={[styles.btn, { backgroundColor: theme.danger }]}>
        <Text style={{ color: "#fff" }}>✕</Text>
      </Pressable>
      <Pressable onPress={acceptCall} style={[styles.btn, { backgroundColor: theme.success }]}>
        <Text style={{ color: "#fff" }}>✓</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    zIndex: 200,
  },
  btn: { width: 38, height: 38, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
});
