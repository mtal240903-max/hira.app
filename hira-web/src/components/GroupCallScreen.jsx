import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import { useAuth } from "../context/AuthContext";
import { useCall } from "../context/CallContext";
import "./GroupCallScreen.css";

const ICON_MIC = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
);
const ICON_MIC_OFF = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 1l22 22M9 9v3a3 3 0 0 0 4.7 2.5M15 9.34V4a3 3 0 0 0-5.94-.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 10v2a7 7 0 0 1-.11 1.23M12 19v3" strokeLinecap="round" />
  </svg>
);
const ICON_VIDEO = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m23 7-7 5 7 5V7Z" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="1" y="5" width="15" height="14" rx="2" />
  </svg>
);
const ICON_VIDEO_OFF = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 16v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1M10.5 5H14a2 2 0 0 1 2 2v3.5M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m23 7-7 5v.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ICON_SCREEN = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" strokeLinecap="round" />
  </svg>
);
const ICON_HANGUP = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23 16.5v3a2 2 0 0 1-2.18 2 19.6 19.6 0 0 1-8.54-3.04 19.3 19.3 0 0 1-6-6A19.6 19.6 0 0 1 3.24 4.18 2 2 0 0 1 5.22 2h3a2 2 0 0 1 2 1.72c.12.9.34 1.78.66 2.61a2 2 0 0 1-.45 2.11L9.1 9.77a15.4 15.4 0 0 0 5.13 5.13l1.33-1.33a2 2 0 0 1 2.11-.45c.83.32 1.71.54 2.61.66A2 2 0 0 1 23 16.5Z" transform="rotate(135 12 12)" />
  </svg>
);

function ParticipantTile({ name, avatarUrl, stream, isVideoCall, isSelf, isMuted }) {
  const videoRef = useRef(null);
  const hasVideoTrack = stream?.getVideoTracks().some((t) => t.enabled);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="group-call__tile">
      {isVideoCall && hasVideoTrack ? (
        <video ref={videoRef} autoPlay playsInline muted={isSelf} className="group-call__tile-video" />
      ) : (
        <div className="group-call__tile-avatar">
          <Avatar name={name} avatarUrl={avatarUrl} size={72} />
        </div>
      )}
      <div className="group-call__tile-label">
        {isMuted && <span className="group-call__tile-muted">🔇</span>}
        <span>{isSelf ? "Toi" : name}</span>
      </div>
    </div>
  );
}

export default function GroupCallScreen() {
  const { user } = useAuth();
  const {
    groupCallStatus,
    groupCallInfo,
    groupParticipants,
    groupLocalStream,
    groupRemoteStreams,
    leaveGroupCall,
    toggleGroupAudio,
    toggleGroupVideo,
    startScreenShare,
    stopScreenShare,
  } = useCall();

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);

  if (groupCallStatus !== "group-active") return null;

  const isVideoCall = groupCallInfo.callType === "video";

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    toggleGroupAudio(!next);
  };

  const handleToggleVideo = () => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    toggleGroupVideo(!next);
  };

  const handleToggleScreenShare = async () => {
    if (isSharingScreen) {
      stopScreenShare();
      setIsSharingScreen(false);
    } else {
      try {
        await startScreenShare();
        setIsSharingScreen(true);
      } catch {
        // L'utilisateur a annulé la sélection de fenêtre/écran — rien à faire
      }
    }
  };

  const totalParticipants = groupParticipants.length + 1; // + soi-même

  return (
    <div className="group-call">
      <header className="group-call__header">
        <p className="group-call__count">{totalParticipants} participant{totalParticipants > 1 ? "s" : ""}</p>
      </header>

      <div className={`group-call__grid group-call__grid--${Math.min(totalParticipants, 6)}`}>
        <ParticipantTile
          name={user.name}
          avatarUrl={user.avatarUrl}
          stream={groupLocalStream}
          isVideoCall={isVideoCall && !isVideoOff}
          isSelf
          isMuted={isMuted}
        />
        {groupParticipants.map((p) => (
          <ParticipantTile
            key={p.userId}
            name={p.name}
            avatarUrl={p.avatarUrl}
            stream={groupRemoteStreams[p.userId]}
            isVideoCall={isVideoCall}
          />
        ))}
      </div>

      <div className="group-call__controls">
        <button className={`group-call__ctrl ${isMuted ? "group-call__ctrl--off" : ""}`} onClick={handleToggleMute} aria-label="Muet">
          {isMuted ? ICON_MIC_OFF : ICON_MIC}
        </button>
        {isVideoCall && (
          <button className={`group-call__ctrl ${isVideoOff ? "group-call__ctrl--off" : ""}`} onClick={handleToggleVideo} aria-label="Caméra">
            {isVideoOff ? ICON_VIDEO_OFF : ICON_VIDEO}
          </button>
        )}
        <button
          className={`group-call__ctrl ${isSharingScreen ? "group-call__ctrl--active" : ""}`}
          onClick={handleToggleScreenShare}
          aria-label="Partager l'écran"
        >
          {ICON_SCREEN}
        </button>
        <button className="group-call__ctrl group-call__ctrl--hangup" onClick={leaveGroupCall} aria-label="Quitter l'appel">
          {ICON_HANGUP}
        </button>
      </div>
    </div>
  );
}
