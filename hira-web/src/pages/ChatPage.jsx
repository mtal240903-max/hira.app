import { useState, useEffect, useCallback, useRef } from "react";
import Avatar from "../components/Avatar";
import ConversationList from "../components/ConversationList";
import ChatWindow from "../components/ChatWindow";
import NewChatModal from "../components/NewChatModal";
import NewGroupModal from "../components/NewGroupModal";
import ProfileModal from "../components/ProfileModal";
import GroupInfoPanel from "../components/GroupInfoPanel";
import StatusBar from "../components/StatusBar";
import StatusViewer from "../components/StatusViewer";
import CreateStatusModal from "../components/CreateStatusModal";
import IncomingCallBanner from "../components/IncomingCallBanner";
import ActiveCallScreen from "../components/ActiveCallScreen";
import IncomingGroupCallBanner from "../components/IncomingGroupCallBanner";
import GroupCallScreen from "../components/GroupCallScreen";
import ThemeToggle from "../components/ThemeToggle";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import * as conversationsApi from "../api/conversations";
import * as mediaApi from "../api/media";
import * as statusApi from "../api/status";
import logo from "../assets/hira-logo.png";
import "./ChatPage.css";

const ICON_NEW_CHAT = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
);

const ICON_CHAT = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ICON_GROUP = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function ChatPage() {
  const { user, logout, updateUser } = useAuth();
  const { socket } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [statusGroups, setStatusGroups] = useState([]);
  const [viewingGroup, setViewingGroup] = useState(null);
  const [isCreateStatusOpen, setIsCreateStatusOpen] = useState(false);
  const menuRef = useRef(null);

  // Ferme le menu "+" si on clique ailleurs
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

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

  // Rafraîchit les statuts quand un contact en publie un nouveau, ou quand on voit un vu confirmé
  useEffect(() => {
    if (!socket) return;
    const handleNewStatus = () => loadStatuses();
    socket.on("status:new", handleNewStatus);
    return () => socket.off("status:new", handleNewStatus);
  }, [socket, loadStatuses]);

  // Met à jour la liste (ordre, aperçu) quand un nouveau message arrive n'importe où
  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = () => loadConversations();
    const handleStatus = ({ userId, status }) => {
      setConversations((prev) =>
        prev.map((conv) => ({
          ...conv,
          members: conv.members.map((m) =>
            m.user._id === userId ? { ...m, user: { ...m.user, status } } : m
          ),
        }))
      );
    };
    socket.on("message:new", handleNewMessage);
    socket.on("user:status", handleStatus);
    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("user:status", handleStatus);
    };
  }, [socket, loadConversations]);

  const handleSelectUser = async (targetUser) => {
    const conversation = await conversationsApi.getOrCreatePrivateConversation(targetUser.id);
    setIsModalOpen(false);
    await loadConversations();
    setActiveConversation(conversation);
  };

  const handleGroupCreated = async (conversation) => {
    setIsGroupModalOpen(false);
    await loadConversations();
    setActiveConversation(conversation);
  };

  const handleSelectConversation = (conv) => {
    setActiveConversation(conv);
    setIsGroupInfoOpen(false);
  };

  const handleGroupUpdated = (updatedConversation) => {
    setActiveConversation(updatedConversation);
    setConversations((prev) =>
      prev.map((c) => (c._id === updatedConversation._id ? updatedConversation : c))
    );
  };

  const handleGroupLeft = () => {
    setConversations((prev) => prev.filter((c) => c._id !== activeConversation._id));
    setActiveConversation(null);
    setIsGroupInfoOpen(false);
  };

  const handleMediaUpload = async (file) => {
    return mediaApi.uploadMedia(file);
  };

  const handleStatusCreated = () => {
    loadStatuses();
  };

  const handleStatusDeleted = (statusId) => {
    setStatusGroups((prev) =>
      prev
        .map((g) => ({ ...g, statuses: g.statuses.filter((s) => s._id !== statusId) }))
        .filter((g) => g.statuses.length > 0)
    );
  };

  return (
    <div className={`chat-page ${activeConversation ? "chat-page--chat-active" : ""}`}>
      <aside className="chat-page__sidebar">
        <header className="sidebar-header">
          <div className="sidebar-header__brand">
            <img src={logo} alt="Hira" className="sidebar-header__logo" />
          </div>
          <div className="sidebar-header__actions">
            <ThemeToggle />
            <div className="sidebar-header__menu-wrap" ref={menuRef}>
              <button className="sidebar-header__new" onClick={() => setIsMenuOpen((v) => !v)} aria-label="Nouvelle discussion ou groupe">
                {ICON_NEW_CHAT}
              </button>
              {isMenuOpen && (
                <div className="sidebar-header__menu">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsModalOpen(true);
                    }}
                  >
                    {ICON_CHAT} Nouvelle discussion
                  </button>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsGroupModalOpen(true);
                    }}
                  >
                    {ICON_GROUP} Nouveau groupe
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <StatusBar
          groups={statusGroups}
          myUserId={user.id}
          onAddStatus={() => setIsCreateStatusOpen(true)}
          onOpenGroup={setViewingGroup}
        />

        {isLoading ? (
          <p className="sidebar-loading">Chargement...</p>
        ) : (
          <ConversationList
            conversations={conversations}
            activeId={activeConversation?._id}
            onSelect={handleSelectConversation}
            myUserId={user.id}
          />
        )}

        <footer className="sidebar-footer">
          <button className="sidebar-footer__profile" onClick={() => setIsProfileModalOpen(true)}>
            <Avatar name={user.name} avatarUrl={user.avatarUrl} size={38} />
            <span className="sidebar-footer__name">{user.name}</span>
          </button>
          <Button variant="ghost" size="sm" onClick={logout}>
            Déconnexion
          </Button>
        </footer>
      </aside>

      <main className="chat-page__main">
        {activeConversation ? (
          <ChatWindow
            conversation={activeConversation}
            onMediaUpload={handleMediaUpload}
            onOpenGroupInfo={() => setIsGroupInfoOpen((v) => !v)}
            onBack={() => setActiveConversation(null)}
          />
        ) : (
          <div className="chat-page__placeholder">
            <img src={logo} alt="Hira" className="chat-page__placeholder-logo" />
            <p>Sélectionne une conversation pour commencer à discuter.</p>
          </div>
        )}
      </main>

      {activeConversation?.type === "group" && isGroupInfoOpen && (
        <GroupInfoPanel
          conversation={activeConversation}
          myUserId={user.id}
          onClose={() => setIsGroupInfoOpen(false)}
          onUpdated={handleGroupUpdated}
          onLeft={handleGroupLeft}
        />
      )}

      {isModalOpen && <NewChatModal onClose={() => setIsModalOpen(false)} onSelectUser={handleSelectUser} />}
      {isGroupModalOpen && <NewGroupModal onClose={() => setIsGroupModalOpen(false)} onCreated={handleGroupCreated} />}
      {isProfileModalOpen && (
        <ProfileModal user={user} onClose={() => setIsProfileModalOpen(false)} onUpdated={updateUser} />
      )}
      {viewingGroup && (
        <StatusViewer
          group={viewingGroup}
          myUserId={user.id}
          onClose={() => setViewingGroup(null)}
          onDeleted={handleStatusDeleted}
        />
      )}
      {isCreateStatusOpen && (
        <CreateStatusModal onClose={() => setIsCreateStatusOpen(false)} onCreated={handleStatusCreated} />
      )}

      <IncomingCallBanner />
      <ActiveCallScreen />
      <IncomingGroupCallBanner />
      <GroupCallScreen />
    </div>
  );
}
