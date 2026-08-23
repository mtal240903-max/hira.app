import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { RTCView } from "react-native-webrtc";
import Avatar from "./Avatar";
import { useCall } from "../context/CallContext";

function formatDuration(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function ActiveCallScreen() {
  const { callStatus, callInfo, localStream, remoteStream, connectionState, endCall, toggleAudio, toggleVideo, switchCamera } = useCall();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const isVideoCall = callInfo?.callType === "video";

  useEffect(() => {
    if (callStatus !== "connected") return;
    const interval = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [callStatus]);

  if (callStatus !== "calling" && callStatus !== "connected") return null;

  const statusLabel =
    callStatus === "calling" ? "Appel en cours..." : connectionState === "connected" ? formatDuration(elapsedSec) : "Connexion...";

  return (
    <View style={styles.container}>
      {isVideoCall && remoteStream ? (
        <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} objectFit="cover" />
      ) : (
        <View style={styles.avatarBg}>
          <Avatar name={callInfo.name} avatarUrl={callInfo.avatarUrl} size={120} />
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.name}>{callInfo.name}</Text>
        <Text style={styles.status}>{statusLabel}</Text>
      </View>

      {isVideoCall && localStream && !isVideoOff && (
        <Pressable onPress={switchCamera} style={styles.localVideoWrap}>
          <RTCView streamURL={localStream.toURL()} style={styles.localVideo} objectFit="cover" mirror />
        </Pressable>
      )}

      <View style={styles.controls}>
        <Pressable
          style={[styles.ctrl, isMuted && styles.ctrlOff]}
          onPress={() => {
            const next = !isMuted;
            setIsMuted(next);
            toggleAudio(!next);
          }}
        >
          <Text style={styles.ctrlIcon}>{isMuted ? "🔇" : "🎤"}</Text>
        </Pressable>
        {isVideoCall && (
          <Pressable
            style={[styles.ctrl, isVideoOff && styles.ctrlOff]}
            onPress={() => {
              const next = !isVideoOff;
              setIsVideoOff(next);
              toggleVideo(!next);
            }}
          >
            <Text style={styles.ctrlIcon}>{isVideoOff ? "📵" : "📹"}</Text>
          </Pressable>
        )}
        <Pressable style={[styles.ctrl, styles.ctrlHangup]} onPress={endCall}>
          <Text style={styles.ctrlIcon}>📞</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#0a0e1a", zIndex: 150, alignItems: "center", justifyContent: "center" },
  remoteVideo: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  avatarBg: { alignItems: "center", justifyContent: "center" },
  header: { position: "absolute", top: 60, left: 0, right: 0, alignItems: "center" },
  name: { color: "#fff", fontSize: 20, fontWeight: "700" },
  status: { color: "#fff", opacity: 0.75, marginTop: 4 },
  localVideoWrap: { position: "absolute", bottom: 120, right: 20, width: 100, height: 140, borderRadius: 14, overflow: "hidden", borderWidth: 2, borderColor: "rgba(255,255,255,0.2)" },
  localVideo: { width: "100%", height: "100%" },
  controls: { position: "absolute", bottom: 40, flexDirection: "row", gap: 16 },
  ctrl: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  ctrlOff: { backgroundColor: "rgba(255,255,255,0.35)" },
  ctrlHangup: { backgroundColor: "#ef4444" },
  ctrlIcon: { fontSize: 22 },
});
