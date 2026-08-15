import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";
import { useWebRTC } from "../hooks/useWebRTC";
import { useGroupWebRTC } from "../hooks/useGroupWebRTC";

const CallContext = createContext(null);

// États possibles : null (aucun appel), "calling" (appel sortant en attente),
// "ringing" (appel entrant), "connected" (en cours)
export function CallProvider({ children }) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const webrtc = useWebRTC();
  const groupWebrtc = useGroupWebRTC();
  const [callStatus, setCallStatus] = useState(null);
  const [callInfo, setCallInfo] = useState(null); // { userId, name, avatarUrl, callType, conversationId }
  const pendingOfferRef = useRef(null);

  // ─── État des appels de groupe (mesh) ───
  // groupCallStatus : null | "group-ringing" | "group-active"
  const [groupCallStatus, setGroupCallStatus] = useState(null);
  const [groupCallInfo, setGroupCallInfo] = useState(null); // { conversationId, callType, fromName, fromAvatar }
  const [groupParticipants, setGroupParticipants] = useState([]); // [{ userId, name, avatarUrl }]
  const groupCallInfoRef = useRef(null);
  useEffect(() => {
    groupCallInfoRef.current = groupCallInfo;
  }, [groupCallInfo]);

  const sendIceCandidate = useCallback(
    (toUserId, candidate) => {
      socket?.emit("call:ice-candidate", { toUserId, candidate });
    },
    [socket]
  );

  // ─── Écoute des événements de signalisation entrants ───
  useEffect(() => {
    if (!socket) return;

    const handleIncoming = ({ fromUserId, fromName, fromAvatar, conversationId, offer, callType }) => {
      // Si déjà en appel, on pourrait rejeter automatiquement — MVP : on ignore
      if (callStatus) return;
      pendingOfferRef.current = offer;
      setCallInfo({ userId: fromUserId, name: fromName, avatarUrl: fromAvatar, callType, conversationId });
      setCallStatus("ringing");
    };

    const handleAnswered = async ({ answer }) => {
      await webrtc.applyAnswer(answer);
      setCallStatus("connected");
    };

    const handleIceCandidate = ({ candidate }) => {
      webrtc.addIceCandidate(candidate);
    };

    const handleRejected = () => {
      webrtc.cleanup();
      setCallStatus(null);
      setCallInfo(null);
    };

    const handleEnded = () => {
      webrtc.cleanup();
      setCallStatus(null);
      setCallInfo(null);
    };

    socket.on("call:incoming", handleIncoming);
    socket.on("call:answered", handleAnswered);
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:rejected", handleRejected);
    socket.on("call:ended", handleEnded);

    return () => {
      socket.off("call:incoming", handleIncoming);
      socket.off("call:answered", handleAnswered);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:rejected", handleRejected);
      socket.off("call:ended", handleEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, callStatus]);

  // ─── Écoute des événements de signalisation des appels de groupe ───
  useEffect(() => {
    if (!socket) return;

    const sendGroupIce = (toUserId, candidate) => {
      const conversationId = groupCallInfoRef.current?.conversationId;
      socket.emit("call:group:ice-candidate", { toUserId, conversationId, candidate });
    };

    const handleGroupIncoming = ({ conversationId, callType, fromUserId, fromName, fromAvatar }) => {
      // On ignore si déjà en appel (1-à-1 ou groupe)
      if (callStatus || groupCallStatus) return;
      setGroupCallInfo({ conversationId, callType, fromUserId, fromName, fromAvatar });
      setGroupCallStatus("group-ringing");
    };

    const handleParticipantJoined = ({ userId, name, avatarUrl }) => {
      setGroupParticipants((prev) =>
        prev.some((p) => p.userId === userId) ? prev : [...prev, { userId, name, avatarUrl }]
      );
    };

    const handleGroupOffer = async ({ fromUserId, offer }) => {
      const stream = groupWebrtc.localStream;
      if (!stream) return;
      const answer = await groupWebrtc.createAnswerFor(fromUserId, stream, offer, sendGroupIce);
      const conversationId = groupCallInfoRef.current?.conversationId;
      socket.emit("call:group:answer", { toUserId: fromUserId, conversationId, answer });
    };

    const handleGroupAnswer = ({ fromUserId, answer }) => {
      groupWebrtc.applyAnswerFrom(fromUserId, answer);
    };

    const handleGroupIceCandidate = ({ fromUserId, candidate }) => {
      groupWebrtc.addIceCandidateFrom(fromUserId, candidate);
    };

    const handleParticipantLeft = ({ userId }) => {
      groupWebrtc.removePeer(userId);
      setGroupParticipants((prev) => prev.filter((p) => p.userId !== userId));
    };

    socket.on("call:group:incoming", handleGroupIncoming);
    socket.on("call:group:participant-joined", handleParticipantJoined);
    socket.on("call:group:offer", handleGroupOffer);
    socket.on("call:group:answer", handleGroupAnswer);
    socket.on("call:group:ice-candidate", handleGroupIceCandidate);
    socket.on("call:group:participant-left", handleParticipantLeft);

    return () => {
      socket.off("call:group:incoming", handleGroupIncoming);
      socket.off("call:group:participant-joined", handleParticipantJoined);
      socket.off("call:group:offer", handleGroupOffer);
      socket.off("call:group:answer", handleGroupAnswer);
      socket.off("call:group:ice-candidate", handleGroupIceCandidate);
      socket.off("call:group:participant-left", handleParticipantLeft);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, callStatus, groupCallStatus, groupWebrtc.localStream]);

  // ─── Actions exposées aux composants ───

  const startCall = useCallback(
    async (targetUser, conversationId, callType) => {
      setCallInfo({ userId: targetUser._id, name: targetUser.name, avatarUrl: targetUser.avatarUrl, callType, conversationId });
      setCallStatus("calling");
      try {
        const offer = await webrtc.startCall(callType, (candidate) => sendIceCandidate(targetUser._id, candidate));
        socket.emit("call:invite", {
          toUserId: targetUser._id,
          conversationId,
          offer,
          callType,
          fromName: user.name,
          fromAvatar: user.avatarUrl,
        });
      } catch (err) {
        setCallStatus(null);
        setCallInfo(null);
        alert("Impossible d'accéder au micro/caméra. Vérifie les autorisations.");
      }
    },
    [socket, user, webrtc, sendIceCandidate]
  );

  const acceptCall = useCallback(async () => {
    if (!callInfo || !pendingOfferRef.current) return;
    try {
      const answer = await webrtc.answerCall(callInfo.callType, pendingOfferRef.current, (candidate) =>
        sendIceCandidate(callInfo.userId, candidate)
      );
      socket.emit("call:answer", { toUserId: callInfo.userId, answer });
      setCallStatus("connected");
    } catch (err) {
      rejectCall();
      alert("Impossible d'accéder au micro/caméra. Vérifie les autorisations.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callInfo, webrtc, sendIceCandidate, socket]);

  const rejectCall = useCallback(() => {
    if (callInfo) socket?.emit("call:reject", { toUserId: callInfo.userId });
    webrtc.cleanup();
    setCallStatus(null);
    setCallInfo(null);
    pendingOfferRef.current = null;
  }, [callInfo, socket, webrtc]);

  const endCall = useCallback(() => {
    if (callInfo) socket?.emit("call:end", { toUserId: callInfo.userId });
    webrtc.cleanup();
    setCallStatus(null);
    setCallInfo(null);
    pendingOfferRef.current = null;
  }, [callInfo, socket, webrtc]);

  // ─── Actions pour les appels de groupe ───

  // Démarre un appel de groupe : annonce à tous les membres de la conversation,
  // puis s'inscrit soi-même dans la "room" d'appel (généralement vide au départ)
  const startGroupCall = useCallback(
    async (conversationId, callType) => {
      try {
        await groupWebrtc.getLocalMedia(callType);
        setGroupCallInfo({ conversationId, callType, fromName: user.name, fromAvatar: user.avatarUrl });
        setGroupCallStatus("group-active");

        socket.emit("call:group:start", {
          conversationId,
          callType,
          fromName: user.name,
          fromAvatar: user.avatarUrl,
        });
        socket.emit("call:group:join", { conversationId, name: user.name, avatarUrl: user.avatarUrl }, (res) => {
          setGroupParticipants(res?.participants || []);
        });
      } catch (err) {
        setGroupCallStatus(null);
        setGroupCallInfo(null);
        alert("Impossible d'accéder au micro/caméra. Vérifie les autorisations.");
      }
    },
    [socket, user, groupWebrtc]
  );

  // Rejoint un appel de groupe déjà annoncé (après avoir accepté la sonnerie)
  const joinGroupCall = useCallback(async () => {
    if (!groupCallInfo) return;
    try {
      const stream = await groupWebrtc.getLocalMedia(groupCallInfo.callType);
      setGroupCallStatus("group-active");

      const sendGroupIce = (toUserId, candidate) => {
        socket.emit("call:group:ice-candidate", { toUserId, conversationId: groupCallInfo.conversationId, candidate });
      };

      socket.emit(
        "call:group:join",
        { conversationId: groupCallInfo.conversationId, name: user.name, avatarUrl: user.avatarUrl },
        async (res) => {
          const participants = res?.participants || [];
          setGroupParticipants(participants);
          // Crée une offre vers chaque participant déjà présent (construction du mesh)
          for (const p of participants) {
            const offer = await groupWebrtc.createOfferFor(p.userId, stream, sendGroupIce);
            socket.emit("call:group:offer", { toUserId: p.userId, conversationId: groupCallInfo.conversationId, offer });
          }
        }
      );
    } catch (err) {
      declineGroupCall();
      alert("Impossible d'accéder au micro/caméra. Vérifie les autorisations.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupCallInfo, groupWebrtc, socket, user]);

  const declineGroupCall = useCallback(() => {
    setGroupCallStatus(null);
    setGroupCallInfo(null);
    setGroupParticipants([]);
  }, []);

  const leaveGroupCall = useCallback(() => {
    if (groupCallInfo) socket?.emit("call:group:leave", { conversationId: groupCallInfo.conversationId });
    groupWebrtc.cleanup();
    setGroupCallStatus(null);
    setGroupCallInfo(null);
    setGroupParticipants([]);
  }, [groupCallInfo, socket, groupWebrtc]);

  return (
    <CallContext.Provider
      value={{
        callStatus,
        callInfo,
        localStream: webrtc.localStream,
        remoteStream: webrtc.remoteStream,
        connectionState: webrtc.connectionState,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleAudio: webrtc.toggleAudio,
        toggleVideo: webrtc.toggleVideo,
        startScreenShare1to1: webrtc.startScreenShare,
        stopScreenShare1to1: webrtc.stopScreenShare,

        // Appels de groupe
        groupCallStatus,
        groupCallInfo,
        groupParticipants,
        groupLocalStream: groupWebrtc.localStream,
        groupRemoteStreams: groupWebrtc.remoteStreams,
        startGroupCall,
        joinGroupCall,
        declineGroupCall,
        leaveGroupCall,
        toggleGroupAudio: groupWebrtc.toggleAudio,
        toggleGroupVideo: groupWebrtc.toggleVideo,
        startScreenShare: groupWebrtc.startScreenShare,
        stopScreenShare: groupWebrtc.stopScreenShare,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall doit être utilisé dans un <CallProvider>");
  return ctx;
}
