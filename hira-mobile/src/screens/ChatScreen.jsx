import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useTheme } from "../context/ThemeContext";
import { useCall } from "../context/CallContext";
import Avatar from "../components/Avatar";
import MessageBubble from "../components/MessageBubble";
import MessageInput from "../components/MessageInput";
import * as conversationsApi from "../api/conversations";
import * as mediaApi from "../api/media";
import { BRAND } from "../theme/colors";

function getConversationDisplay(conversation, myUserId) {
  if (conversation.type === "group") {
    return { name: conversation.name, avatarUrl: conversation.avatarUrl, online: false, subtitle: `${conversation.members.length} membres` };
  }
  const other = conversation.members.find((m) => m.user._id !== myUserId)?.user;
  return {
    name: other?.name || "Utilisateur",
    avatarUrl: other?.avatarUrl,
    online: other?.status === "online",
    subtitle: other?.status === "online" ? "En ligne" : "Hors ligne",
  };
}

export default function ChatScreen({ route, navigation }) {
  const { conversation } = route.params;
  const { user } = useAuth();
  const { socket } = useSocket();
  const { theme } = useTheme();
  const { startCall, callStatus } = useCall();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typingUser, setTypingUser] = useState(null);
  const listRef = useRef(null);

  const display = getConversationDisplay(conversation, user.id);
  const otherUser = conversation.type === "private"
    ? conversation.members.find((m) => m.user._id !== user.id)?.user
    : null;

  const handleStartCall = (callType) => {
    if (!otherUser || callStatus) return;
    startCall(otherUser, conversation._id, callType);
  };

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: () => (
        <Pressable
          style={styles.headerTitle}
          onPress={() => conversation.type === "group" && navigation.navigate("GroupInfo", { conversation })}
        >
          <Avatar name={display.name} avatarUrl={display.avatarUrl} online={display.online} size={34} />
          <View>
            <Text style={{ color: theme.textPrimary, fontWeight: "700", fontSize: 15 }}>{display.name}</Text>
            <Text style={{ color: theme.textTertiary, fontSize: 11 }}>{display.subtitle}</Text>
          </View>
        </Pressable>
      ),
      headerRight: () =>
        conversation.type === "private" ? (
          <View style={{ flexDirection: "row", gap: 16 }}>
            <Pressable onPress={() => handleStartCall("audio")}>
              <Text style={{ fontSize: 18 }}>📞</Text>
            </Pressable>
            <Pressable onPress={() => handleStartCall("video")}>
              <Text style={{ fontSize: 18 }}>📹</Text>
            </Pressable>
          </View>
        ) : null,
      headerStyle: { backgroundColor: theme.bgSurface },
      headerTintColor: theme.textPrimary,
    });
  }, [navigation, display, theme, conversation, callStatus]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    conversationsApi.getMessages(conversation._id).then((msgs) => {
      if (!cancelled) {
        setMessages(msgs);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [conversation._id]);

  useEffect(() => {
    if (!socket) return;
    socket.emit("conversation:join", { conversationId: conversation._id });

    const handleNewMessage = ({ message }) => {
      if (message.conversation !== conversation._id) return;
      setMessages((prev) => [...prev, message]);
      if (message.sender._id !== user.id) {
        socket.emit("message:delivered", { messageId: message._id });
        socket.emit("message:read", { conversationId: conversation._id, messageId: message._id });
      }
    };
    const handleTypingStart = ({ conversationId, userId }) => {
      if (conversationId === conversation._id && userId !== user.id) setTypingUser(display.name);
    };
    const handleTypingStop = ({ conversationId, userId }) => {
      if (conversationId === conversation._id && userId !== user.id) setTypingUser(null);
    };
    const handleEdit = ({ message }) => {
      setMessages((prev) => prev.map((m) => (m._id === message._id ? message : m)));
    };
    const handleDelete = ({ messageId, conversationId }) => {
      if (conversationId !== conversation._id) return;
      setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, isDeleted: true, content: "" } : m)));
    };

    socket.on("message:new", handleNewMessage);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);
    socket.on("message:edit", handleEdit);
    socket.on("message:delete", handleDelete);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      socket.off("message:edit", handleEdit);
      socket.off("message:delete", handleDelete);
    };
  }, [socket, conversation._id, user.id, display.name]);

  const handleSend = useCallback(
    (content) => {
      if (!socket) return;
      const tempId = `temp-${Date.now()}`;
      const optimistic = {
        _id: tempId,
        conversation: conversation._id,
        sender: { _id: user.id, name: user.name, avatarUrl: user.avatarUrl },
        type: "text",
        content,
        createdAt: new Date().toISOString(),
        reactions: [],
      };
      setMessages((prev) => [...prev, optimistic]);

      socket.emit("message:send", { conversationId: conversation._id, type: "text", content, tempId }, (response) => {
        if (response.success) {
          setMessages((prev) => prev.map((m) => (m._id === tempId ? response.message : m)));
        } else {
          setMessages((prev) => prev.filter((m) => m._id !== tempId));
        }
      });
    },
    [socket, conversation._id, user]
  );

  const handleMediaFile = useCallback(
    async (file) => {
      if (!socket) return;
      try {
        const { category, media } = await mediaApi.uploadMedia(file);
        const tempId = `temp-${Date.now()}`;
        socket.emit(
          "message:send",
          { conversationId: conversation._id, type: category, media, tempId },
          (response) => {
            if (response.success) setMessages((prev) => [...prev, response.message]);
          }
        );
      } catch (err) {
        Alert.alert("Erreur", "Échec de l'envoi du média.");
      }
    },
    [socket, conversation._id]
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bgApp }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} color={BRAND.blue} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m._id}
          renderItem={({ item }) => (
            <MessageBubble message={item} isMine={(item.sender._id || item.sender) === user.id} />
          )}
          contentContainerStyle={{ paddingVertical: 12 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {typingUser && (
        <Text style={{ color: theme.textTertiary, fontSize: 12, paddingHorizontal: 16, paddingBottom: 4 }}>
          {typingUser} écrit...
        </Text>
      )}

      <MessageInput
        onSend={handleSend}
        onFileSelect={handleMediaFile}
        onVoiceRecorded={handleMediaFile}
        onTypingStart={() => socket?.emit("typing:start", { conversationId: conversation._id })}
        onTypingStop={() => socket?.emit("typing:stop", { conversationId: conversation._id })}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerTitle: { flexDirection: "row", alignItems: "center", gap: 10 },
});
