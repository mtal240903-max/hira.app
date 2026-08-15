import { useEffect, useRef, useState, useCallback } from "react";
import Avatar from "./Avatar";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import MediaPreviewModal from "./MediaPreviewModal";
import TypingIndicator from "./TypingIndicator";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import { useCall } from "../context/CallContext";
import * as conversationsApi from "../api/conversations";
import "./ChatWindow.css";

const ICON_CALL_AUDIO = (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.36 11.36 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.36 11.36 0 0 0 .57 3.57 1 1 0 0 1-.25 1.02l-2.2 2.2Z" />
  </svg>
);

const ICON_CALL_VIDEO = (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m23 7-7 5 7 5V7Z" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="1" y="5" width="15" height="14" rx="2" />
  </svg>
);

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

export default function ChatWindow({ conversation, onMediaUpload, onOpenGroupInfo, onBack }) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const { startCall, callStatus, startGroupCall, groupCallStatus } = useCall();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [typingUser, setTypingUser] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [isSendingMedia, setIsSendingMedia] = useState(false);
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const shouldStickToBottom = useRef(true);

  const display = getConversationDisplay(conversation, user.id);
  const otherUser = conversation.type === "private"
    ? conversation.members.find((m) => m.user._id !== user.id)?.user
    : null;
  const PAGE_SIZE = 30;

  const handleStartCall = (callType) => {
    if (!otherUser || callStatus) return;
    startCall(otherUser, conversation._id, callType);
  };

  const handleStartGroupCall = (callType) => {
    if (callStatus || groupCallStatus) return;
    startGroupCall(conversation._id, callType);
  };

  // Charge l'historique quand on change de conversation
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setReplyTo(null);
    setHasMore(true);
    shouldStickToBottom.current = true;
    conversationsApi.getMessages(conversation._id, { limit: PAGE_SIZE }).then((msgs) => {
      if (!cancelled) {
        setMessages(msgs);
        setHasMore(msgs.length === PAGE_SIZE);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [conversation._id]);

  // Charge une page plus ancienne quand on scrolle tout en haut, en conservant la position visuelle
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;
    setIsLoadingMore(true);
    shouldStickToBottom.current = false;

    const container = scrollRef.current;
    const previousHeight = container?.scrollHeight || 0;

    const oldest = messages[0];
    const older = await conversationsApi.getMessages(conversation._id, {
      before: oldest._id,
      limit: PAGE_SIZE,
    });

    setMessages((prev) => [...older, ...prev]);
    setHasMore(older.length === PAGE_SIZE);
    setIsLoadingMore(false);

    // Restaure la position de scroll pour que la vue ne "saute" pas
    requestAnimationFrame(() => {
      if (container) {
        const newHeight = container.scrollHeight;
        container.scrollTop = newHeight - previousHeight;
      }
    });
  }, [conversation._id, messages, isLoadingMore, hasMore]);

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    if (container.scrollTop < 80) {
      loadMore();
    }
  }, [loadMore]);

  // Rejoint la room socket de cette conversation et écoute les événements
  useEffect(() => {
    if (!socket) return;

    socket.emit("conversation:join", { conversationId: conversation._id });

    const handleNewMessage = ({ message }) => {
      if (message.conversation !== conversation._id) return;
      shouldStickToBottom.current = true;
      setMessages((prev) => [...prev, message]);
      if (message.sender._id !== user.id) {
        socket.emit("message:delivered", { messageId: message._id });
        socket.emit("message:read", { conversationId: conversation._id, messageId: message._id });
      }
    };

    const handleTypingStart = ({ conversationId, userId }) => {
      if (conversationId === conversation._id && userId !== user.id) {
        setTypingUser(display.name);
      }
    };
    const handleTypingStop = ({ conversationId, userId }) => {
      if (conversationId === conversation._id && userId !== user.id) {
        setTypingUser(null);
      }
    };

    const handleEdit = ({ message }) => {
      setMessages((prev) => prev.map((m) => (m._id === message._id ? message : m)));
    };
    const handleDelete = ({ messageId, conversationId }) => {
      if (conversationId !== conversation._id) return;
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, isDeleted: true, content: "" } : m))
      );
    };
    const handleReact = ({ messageId, userId, emoji }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id !== messageId) return m;
          const reactions = (m.reactions || []).filter((r) => r.user !== userId);
          if (emoji) reactions.push({ user: userId, emoji });
          return { ...m, reactions };
        })
      );
    };

    socket.on("message:new", handleNewMessage);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);
    socket.on("message:edit", handleEdit);
    socket.on("message:delete", handleDelete);
    socket.on("message:react", handleReact);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      socket.off("message:edit", handleEdit);
      socket.off("message:delete", handleDelete);
      socket.off("message:react", handleReact);
    };
  }, [socket, conversation._id, user.id, display.name]);

  // Scroll vers le bas uniquement quand c'est pertinent (nouveau message, premier chargement)
  // — pas pendant une pagination vers le haut, sinon la vue "saute"
  useEffect(() => {
    if (shouldStickToBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: isLoading ? "auto" : "smooth" });
    }
  }, [messages.length, isLoading]);

  const handleSend = useCallback(
    (content) => {
      if (!socket) return;
      const tempId = `temp-${Date.now()}`;

      // Envoi optimiste : on affiche le message tout de suite, avant confirmation serveur
      const optimisticMessage = {
        _id: tempId,
        conversation: conversation._id,
        sender: { _id: user.id, name: user.name, avatarUrl: user.avatarUrl },
        type: "text",
        content,
        replyTo: replyTo || null,
        createdAt: new Date().toISOString(),
        reactions: [],
      };
      setMessages((prev) => [...prev, optimisticMessage]);
      setReplyTo(null);
      shouldStickToBottom.current = true;

      socket.emit(
        "message:send",
        {
          conversationId: conversation._id,
          type: "text",
          content,
          replyTo: replyTo?._id || null,
          tempId,
        },
        (response) => {
          if (response.success) {
            setMessages((prev) => prev.map((m) => (m._id === tempId ? response.message : m)));
          } else {
            // Échec d'envoi : on retire le message optimiste
            setMessages((prev) => prev.filter((m) => m._id !== tempId));
          }
        }
      );
    },
    [socket, conversation._id, user, replyTo]
  );

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = "";
  };

  const handleVoiceRecorded = async (file) => {
    if (!onMediaUpload || !socket) return;
    const { category, media } = await onMediaUpload(file);
    const tempId = `temp-${Date.now()}`;
    shouldStickToBottom.current = true;

    socket.emit(
      "message:send",
      { conversationId: conversation._id, type: category, media, tempId },
      (response) => {
        if (response.success) {
          setMessages((prev) => [...prev, response.message]);
        }
      }
    );
  };

  const handleConfirmMediaSend = async (caption) => {
    if (!pendingFile || !onMediaUpload || !socket) return;
    setIsSendingMedia(true);
    try {
      const { category, media } = await onMediaUpload(pendingFile);
      const tempId = `temp-${Date.now()}`;

      socket.emit(
        "message:send",
        { conversationId: conversation._id, type: category, content: caption || "", media, tempId },
        (response) => {
          if (response.success) {
            shouldStickToBottom.current = true;
            setMessages((prev) => [...prev, response.message]);
          }
        }
      );
      setPendingFile(null);
    } finally {
      setIsSendingMedia(false);
    }
  };

  return (
    <div className="chat-window">
      <header
        className={`chat-header ${conversation.type === "group" ? "chat-header--clickable" : ""}`}
      >
        <button
          className="chat-header__back"
          onClick={(e) => {
            e.stopPropagation();
            onBack?.();
          }}
          aria-label="Retour aux conversations"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div
          className="chat-header__identity"
          onClick={() => conversation.type === "group" && onOpenGroupInfo?.()}
        >
          <Avatar name={display.name} avatarUrl={display.avatarUrl} online={display.online} size={42} />
          <div>
            <h2 className="chat-header__name">{display.name}</h2>
            <p className="chat-header__subtitle">{display.subtitle}</p>
          </div>
        </div>

        {conversation.type === "private" && (
          <div className="chat-header__call-actions">
            <button className="chat-header__call-btn" onClick={() => handleStartCall("audio")} aria-label="Appel audio">
              {ICON_CALL_AUDIO}
            </button>
            <button className="chat-header__call-btn" onClick={() => handleStartCall("video")} aria-label="Appel vidéo">
              {ICON_CALL_VIDEO}
            </button>
          </div>
        )}

        {conversation.type === "group" && (
          <div className="chat-header__call-actions">
            <button className="chat-header__call-btn" onClick={() => handleStartGroupCall("audio")} aria-label="Appel de groupe audio">
              {ICON_CALL_AUDIO}
            </button>
            <button className="chat-header__call-btn" onClick={() => handleStartGroupCall("video")} aria-label="Appel de groupe vidéo">
              {ICON_CALL_VIDEO}
            </button>
          </div>
        )}
      </header>

      <div className="chat-messages" ref={scrollRef} onScroll={handleScroll}>
        {isLoading ? (
          <div className="chat-messages__loading">Chargement des messages...</div>
        ) : messages.length === 0 ? (
          <div className="chat-messages__empty">
            <p>Dis bonjour 👋</p>
            <p className="chat-messages__empty-hint">Aucun message pour l'instant dans cette conversation.</p>
          </div>
        ) : (
          <>
            {isLoadingMore && <div className="chat-messages__loading-more">Chargement...</div>}
            {!hasMore && messages.length > 0 && (
              <p className="chat-messages__start">Début de la conversation</p>
            )}
            {messages.map((msg) => (
              <div key={msg._id} onDoubleClick={() => setReplyTo(msg)}>
                <MessageBubble message={msg} isMine={(msg.sender._id || msg.sender) === user.id} />
              </div>
            ))}
          </>
        )}
        {typingUser && <TypingIndicator name={typingUser} />}
        <div ref={bottomRef} />
      </div>

      <MessageInput
        onSend={handleSend}
        onFileSelect={handleFileSelect}
        onVoiceRecorded={handleVoiceRecorded}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onTypingStart={() => socket?.emit("typing:start", { conversationId: conversation._id })}
        onTypingStop={() => socket?.emit("typing:stop", { conversationId: conversation._id })}
      />

      {pendingFile && (
        <MediaPreviewModal
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onConfirm={handleConfirmMediaSend}
          isSending={isSendingMedia}
        />
      )}
    </div>
  );
}
