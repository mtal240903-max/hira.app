import { useState, useEffect, useCallback } from "react";
import { View, Text, Image, Pressable, StyleSheet, Alert } from "react-native";
import { Video } from "expo-av";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/Avatar";
import * as statusApi from "../api/status";

const DURATION_MS = 5000;

function formatTimeAgo(date) {
  const diffMin = Math.floor((Date.now() - new Date(date)) / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  return `il y a ${Math.floor(diffMin / 60)} h`;
}

export default function StatusViewerScreen({ route, navigation }) {
  const { group } = route.params;
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const isMine = group.user._id === user.id;
  const current = group.statuses[index];

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (i + 1 >= group.statuses.length) {
        navigation.goBack();
        return i;
      }
      return i + 1;
    });
    setProgress(0);
  }, [group.statuses.length, navigation]);

  const goPrev = () => {
    setIndex((i) => Math.max(0, i - 1));
    setProgress(0);
  };

  useEffect(() => {
    if (!isMine) statusApi.viewStatus(current._id).catch(() => {});
    const start = Date.now();
    const interval = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / DURATION_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
        goNext();
      }
    }, 50);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current._id]);

  const handleDelete = () => {
    Alert.alert("Supprimer ce statut ?", "", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          await statusApi.deleteStatus(current._id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressRow}>
        {group.statuses.map((s, i) => (
          <View key={s._id} style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${i < index ? 100 : i === index ? progress : 0}%` }]}
            />
          </View>
        ))}
      </View>

      <View style={styles.header}>
        <Avatar name={group.user.name} avatarUrl={group.user.avatarUrl} size={34} />
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName}>{group.user.name}</Text>
          <Text style={styles.authorTime}>{formatTimeAgo(current.createdAt)}</Text>
        </View>
        {isMine && (
          <Pressable onPress={handleDelete} style={{ padding: 6 }}>
            <Text style={{ color: "#fff", fontSize: 18 }}>🗑</Text>
          </Pressable>
        )}
        <Pressable onPress={() => navigation.goBack()} style={{ padding: 6 }}>
          <Text style={{ color: "#fff", fontSize: 20 }}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Pressable style={[styles.nav, { left: 0 }]} onPress={goPrev} />
        <Pressable style={[styles.nav, { right: 0 }]} onPress={goNext} />

        {current.type === "text" ? (
          <View style={[styles.textSlide, { backgroundColor: current.backgroundColor }]}>
            <Text style={styles.textSlideContent}>{current.content}</Text>
          </View>
        ) : current.type === "image" ? (
          <Image source={{ uri: current.media?.url }} style={styles.media} resizeMode="contain" />
        ) : (
          <Video source={{ uri: current.media?.url }} style={styles.media} useNativeControls resizeMode="contain" shouldPlay />
        )}

        {current.content && current.type !== "text" && (
          <Text style={styles.caption}>{current.content}</Text>
        )}
      </View>

      {isMine && current.viewers.length > 0 && (
        <Text style={styles.viewers}>👁 {current.viewers.length} vue{current.viewers.length > 1 ? "s" : ""}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  progressRow: { flexDirection: "row", gap: 4, paddingHorizontal: 12, paddingTop: 50 },
  progressTrack: { flex: 1, height: 3, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  authorName: { color: "#fff", fontWeight: "700", fontSize: 14 },
  authorTime: { color: "#fff", opacity: 0.7, fontSize: 11 },
  body: { flex: 1, alignItems: "center", justifyContent: "center" },
  nav: { position: "absolute", top: 0, bottom: 0, width: "35%", zIndex: 5 },
  textSlide: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center", padding: 40 },
  textSlideContent: { color: "#fff", fontSize: 22, fontWeight: "700", textAlign: "center" },
  media: { width: "100%", height: "100%" },
  caption: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    color: "#fff",
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 10,
    borderRadius: 10,
  },
  viewers: { color: "#fff", textAlign: "center", padding: 10, opacity: 0.85, fontSize: 13 },
});
