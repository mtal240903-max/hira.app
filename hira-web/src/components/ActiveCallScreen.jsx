import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import { useCall } from "../context/CallContext";
import "./ActiveCallScreen.css";

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
const ICON_HANGUP = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23 16.5v3a2 2 0 0 1-2.18 2 19.6 19.6 0 0 1-8.54-3.04 19.3 19.3 0 0 1-6-6A19.6 19.6 0 0 1 3.24 4.18 2 2 0 0 1 5.22 2h3a2 2 0 0 1 2 1.72c.12.9.34 1.78.66 2.61a2 2 0 0 1-.45 2.11L9.1 9.77a15.4 15.4 0 0 0 5.13 5.13l1.33-1.33a2 2 0 0 1 2.11-.45c.83.32 1.71.54 2.61.66A2 2 0 0 1 23 16.5Z" transform="rotate(135 12 12)" />
  </svg>
);

const ICON_SCREEN = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" strokeLinecap="round" />
  </svg>
);

function formatDuration(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function ActiveCallScreen() {
  const {
    callStatus,
    callInfo,
    localStream,
    remoteStream,
    connectionState,
    endCall,
    toggleAudio,
    toggleVideo,
    startScreenShare1to1,
    stopScreenShare1to1,
  } = useCall();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const isVideoCall = callInfo?.callType === "video";

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (isVideoCall && remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
    if (!isVideoCall && remoteAudioRef.current && remoteStream) remoteAudioRef.current.srcObject = remoteStream;
  }, [remoteStream, isVideoCall]);

  useEffect(() => {
    if (callStatus !== "connected") return;
    const interval = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [callStatus]);

  if (callStatus !== "calling" && callStatus !== "connected") return null;

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    toggleAudio(!next);
  };

  const handleToggleVideo = () => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    toggleVideo(!next);
  };

  const handleToggleScreenShare = async () => {
    if (isSharingScreen) {
      stopScreenShare1to1();
      setIsSharingScreen(false);
    } else {
      try {
        await startScreenShare1to1();
        setIsSharingScreen(true);
      } catch {
        // Sélection annulée par l'utilisateur — rien à faire
      }
    }
  };

  const statusLabel =
    callStatus === "calling" ? "Appel en cours..." : connectionState === "connected" ? formatDuration(elapsedSec) : "Connexion...";

  return (
    <div className="active-call">
      {isVideoCall && remoteStream ? (
        <video ref={remoteVideoRef} className="active-call__remote-video" autoPlay playsInline />
      ) : (
        <div className="active-call__avatar-bg">
          <Avatar name={callInfo.name} avatarUrl={callInfo.avatarUrl} size={120} />
        </div>
      )}

      {!isVideoCall && <audio ref={remoteAudioRef} autoPlay />}

      <div className="active-call__header">
        <p className="active-call__name">{callInfo.name}</p>
        <p className="active-call__status">{statusLabel}</p>
      </div>

      {isVideoCall && localStream && !isVideoOff && (
        <video ref={localVideoRef} className="active-call__local-video" autoPlay playsInline muted />
      )}

      <div className="active-call__controls">
        <button className={`active-call__ctrl ${isMuted ? "active-call__ctrl--off" : ""}`} onClick={handleToggleMute} aria-label="Muet">
          {isMuted ? ICON_MIC_OFF : ICON_MIC}
        </button>
        {isVideoCall && (
          <button className={`active-call__ctrl ${isVideoOff ? "active-call__ctrl--off" : ""}`} onClick={handleToggleVideo} aria-label="Caméra">
            {isVideoOff ? ICON_VIDEO_OFF : ICON_VIDEO}
          </button>
        )}
        <button
          className={`active-call__ctrl ${isSharingScreen ? "active-call__ctrl--active" : ""}`}
          onClick={handleToggleScreenShare}
          aria-label="Partager l'écran"
        >
          {ICON_SCREEN}
        </button>
        <button className="active-call__ctrl active-call__ctrl--hangup" onClick={endCall} aria-label="Raccrocher">
          {ICON_HANGUP}
        </button>
      </div>
    </div>
  );
}
