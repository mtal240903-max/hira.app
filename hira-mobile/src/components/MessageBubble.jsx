import { View, Text, Image, StyleSheet } from "react-native";
import { Video } from "expo-av";
import { useTheme } from "../context/ThemeContext";
import { radius } from "../theme/colors";

function formatTime(date) {
  return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({ message, isMine, onLongPress }) {
  const { theme } = useTheme();
  const isDeleted = message.isDeleted;

  return (
    <View style={[styles.row, isMine && styles.rowMine]}>
      <View
        onTouchEnd={onLongPress}
        style={[
          styles.bubble,
          isMine
            ? { backgroundColor: theme.bubbleOutEnd, borderBottomRightRadius: 4 }
            : { backgroundColor: theme.bubbleIn, borderBottomLeftRadius: 4 },
          isDeleted && { opacity: 0.6 },
        ]}
      >
        {message.replyTo && !isDeleted && (
          <View style={styles.replyBox}>
            <Text style={styles.replyAuthor}>{message.replyTo.sender?.name || "Message"}</Text>
            <Text style={styles.replyText} numberOfLines={1}>
              {message.replyTo.isDeleted ? "Message supprimé" : message.replyTo.content}
            </Text>
          </View>
        )}

        {isDeleted ? (
          <Text style={[styles.text, isMine ? styles.textMine : { color: theme.bubbleInText }, { fontStyle: "italic" }]}>
            Message supprimé
          </Text>
        ) : message.type === "text" ? (
          <Text style={[styles.text, isMine ? styles.textMine : { color: theme.bubbleInText }]}>{message.content}</Text>
        ) : message.type === "image" ? (
          <Image source={{ uri: message.media?.url }} style={styles.media} resizeMode="cover" />
        ) : message.type === "video" ? (
          <Video source={{ uri: message.media?.url }} style={styles.media} useNativeControls resizeMode="cover" />
        ) : message.type === "audio" ? (
          <View style={styles.audioPlaceholder}>
            <Text style={{ color: isMine ? "#fff" : theme.bubbleInText }}>🎤 Message vocal</Text>
          </View>
        ) : (
          <Text style={[styles.text, isMine ? styles.textMine : { color: theme.bubbleInText }, { textDecorationLine: "underline" }]}>
            📄 {message.media?.fileName || "Document"}
          </Text>
        )}

        <View style={styles.metaRow}>
          {message.isEdited && !isDeleted && (
            <Text style={[styles.meta, { color: isMine ? "rgba(255,255,255,0.7)" : theme.textTertiary }]}>modifié</Text>
          )}
          <Text style={[styles.meta, { color: isMine ? "rgba(255,255,255,0.7)" : theme.textTertiary }]}>
            {formatTime(message.createdAt)}
          </Text>
        </View>

        {message.reactions?.length > 0 && (
          <View style={[styles.reactions, { backgroundColor: theme.bgSurface, borderColor: theme.borderDefault }]}>
            {message.reactions.map((r, i) => (
              <Text key={i} style={{ fontSize: 13 }}>{r.emoji}</Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, paddingVertical: 2, flexDirection: "row" },
  rowMine: { justifyContent: "flex-end" },
  bubble: { maxWidth: "78%", paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, position: "relative" },
  text: { fontSize: 15, lineHeight: 20 },
  textMine: { color: "#fff" },
  media: { width: 220, height: 220, borderRadius: radius.sm },
  audioPlaceholder: { paddingVertical: 4 },
  replyBox: {
    borderLeftWidth: 3,
    borderLeftColor: "rgba(255,255,255,0.4)",
    paddingLeft: 8,
    paddingVertical: 4,
    marginBottom: 6,
    backgroundColor: "rgba(0,0,0,0.12)",
    borderRadius: 4,
  },
  replyAuthor: { fontWeight: "700", fontSize: 12, color: "#fff", opacity: 0.85 },
  replyText: { fontSize: 12, color: "#fff", opacity: 0.75 },
  metaRow: { flexDirection: "row", justifyContent: "flex-end", gap: 6, marginTop: 3 },
  meta: { fontSize: 10 },
  reactions: {
    position: "absolute",
    bottom: -10,
    right: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    flexDirection: "row",
    gap: 2,
  },
});
