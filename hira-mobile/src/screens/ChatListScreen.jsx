import { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, Pressable, Image, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useTheme } from "../context/ThemeContext";
import Avatar from "../components/Avatar";
import * as conversationsApi from "../api/conversations";
import * as statusApi from "../api/status";
import { radius, BRAND } from "../theme/colors";
import logo from "../assets/hira-logo.png";

function getConversationDisplay(conversation, myUserId) {
  if (conversation.type === "group") {
    return { name: conversation.name, avatarUrl: conversation.avatarUrl, online: false };
  }
  const other = conversation.members.find((m) => m.user._id !== myUserId)?.user;
  return { name: other?.name || "Utilisateur", avatarUrl: other?.avatarUrl, online: other?.status === "online" };
}

function formatPreview(message) {
  if (!message) return "Aucun message";
  if (message.isDeleted) return "Message supprimé";
  if (message.type === "text") return message.content;
  const labels = { image: "📷 Photo", video: "🎬 Vidéo", audio: "🎤 Message vocal", document: "📄 Document" };
  return labels[message.type] || "Message";
}

function formatTime(date) {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export default function ChatListScreen({ navigation }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { theme } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [statusGroups, setStatusGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    const list = await conversationsApi.getMyConversations();
    setConversations(list);
    setIsLoading(false);
  }, []);

  const loadStatuses = useCallback(async () => {
    const groups = await statusApi.getStatuses();
    setStatusGroups(groups);
  }, []);

  useEffect(() => {
    loadConversations();
    loadStatuses();
  }, [loadConversations, loadStatuses]);

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = () => loadConversations();
    const handleNewStatus = () => loadStatuses();
    socket.on("message:new", handleNewMessage);
    socket.on("status:new", handleNewStatus);
    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("status:new", handleNewStatus);
    };
  }, [socket, loadConversations, loadStatuses]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      loadConversations();
      loadStatuses();
    });
    return unsub;
  }, [navigation, loadConversations, loadStatuses]);

  const myStatusGroup = statusGroups.find((g) => g.user._id === user.id);
  const otherStatusGroups = statusGroups.filter((g) => g.user._id !== user.id);

  return (
    <View style={[styles.container, { backgroundColor: theme.bgApp }]}>
      <View style={[styles.header, { borderColor: theme.borderSubtle, backgroundColor: theme.bgSurface }]}>
        <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
        <View style={styles.headerActions}>
          <Pressable onPress={() => navigation.navigate("Profile")} style={styles.headerBtn}>
            <Avatar name={user.name} avatarUrl={user.avatarUrl} size={34} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate("NewGroup")} style={styles.headerBtn}>
            <Text style={[styles.headerBtnIcon, { color: theme.textSecondary }]}>👥</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("NewChat")}
            style={[styles.newChatBtn, { backgroundColor: BRAND.blue }]}
          >
            <Text style={styles.newChatBtnText}>+</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={otherStatusGroups}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(g) => g.user._id}
        style={[styles.statusBar, { borderColor: theme.borderSubtle }]}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 14 }}
        ListHeaderComponent={
          <Pressable
            style={styles.statusItem}
            onPress={() =>
              myStatusGroup
                ? navigation.navigate("StatusViewer", { group: myStatusGroup })
                : navigation.navigate("CreateStatus")
            }
          >
            <View>
              <Avatar name="Mon statut" avatarUrl={myStatusGroup?.user.avatarUrl} size={52} />
              <Pressable
                style={[styles.addBadge, { backgroundColor: BRAND.blue, borderColor: theme.bgSurface }]}
                onPress={() => navigation.navigate("CreateStatus")}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>+</Text>
              </Pressable>
            </View>
            <Text style={[styles.statusLabel, { color: theme.textSecondary }]} numberOfLines={1}>
              Mon statut
            </Text>
          </Pressable>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.statusItem} onPress={() => navigation.navigate("StatusViewer", { group: item })}>
            <Avatar name={item.user.name} avatarUrl={item.user.avatarUrl} size={52} online={false} />
            <Text style={[styles.statusLabel, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.user.name.split(" ")[0]}
            </Text>
          </Pressable>
        )}
      />

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={BRAND.blue} />
      ) : conversations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ color: theme.textSecondary }}>Aucune conversation pour l'instant.</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c._id}
          renderItem={({ item }) => {
            const display = getConversationDisplay(item, user.id);
            return (
              <Pressable
                style={({ pressed }) => [styles.convItem, pressed && { backgroundColor: theme.bgHover }]}
                onPress={() => navigation.navigate("Chat", { conversation: item })}
              >
                <Avatar name={display.name} avatarUrl={display.avatarUrl} online={display.online} size={50} />
                <View style={styles.convBody}>
                  <View style={styles.convTop}>
                    <Text style={[styles.convName, { color: theme.textPrimary }]} numberOfLines={1}>
                      {display.name}
                    </Text>
                    <Text style={[styles.convTime, { color: theme.textTertiary }]}>
                      {formatTime(item.lastMessageAt)}
                    </Text>
                  </View>
                  <Text style={[styles.convPreview, { color: theme.textSecondary }]} numberOfLines={1}>
                    {formatPreview(item.lastMessage)}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLogo: { height: 30, width: 90 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerBtn: { padding: 2 },
  headerBtnIcon: { fontSize: 20 },
  newChatBtn: { width: 34, height: 34, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  newChatBtnText: { color: "#fff", fontSize: 20, fontWeight: "700", marginTop: -2 },
  statusBar: { maxHeight: 92, borderBottomWidth: 1, flexGrow: 0 },
  statusItem: { alignItems: "center", width: 62, gap: 4 },
  addBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  statusLabel: { fontSize: 11 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  convItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  convBody: { flex: 1, minWidth: 0 },
  convTop: { flexDirection: "row", justifyContent: "space-between" },
  convName: { fontWeight: "700", fontSize: 15, flexShrink: 1 },
  convTime: { fontSize: 11 },
  convPreview: { fontSize: 13, marginTop: 2 },
});
