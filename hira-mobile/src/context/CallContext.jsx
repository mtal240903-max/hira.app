import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";
import { useWebRTC } from "../hooks/useWebRTC";

const CallContext = createContext(null);

export function CallProvider({ children }) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const webrtc = useWebRTC();
  const [callStatus, setCallStatus] = useState(null);
  const [callInfo, setCallInfo] = useState(null);
  const pendingOfferRef = useRef(null);

  const sendIceCandidate = useCallback(
    (toUserId, candidate) => socket?.emit("call:ice-candidate", { toUserId, candidate }),
    [socket]
  );

  useEffect(() => {
    if (!socket) return;

    const handleIncoming = ({ fromUserId, fromName, fromAvatar, conversationId, offer, callType }) => {
      if (callStatus) return;
      pendingOfferRef.current = offer;
      setCallInfo({ userId: fromUserId, name: fromName, avatarUrl: fromAvatar, callType, conversationId });
      setCallStatus("ringing");
    };

    const handleAnswered = async ({ answer }) => {
      await webrtc.applyAnswer(answer);
      setCallStatus("connected");
    };

    const handleIceCandidate = ({ candidate }) => webrtc.addIceCandidate(candidate);

    const handleEnd = () => {
      webrtc.cleanup();
      setCallStatus(null);
      setCallInfo(null);
    };

    socket.on("call:incoming", handleIncoming);
    socket.on("call:answered", handleAnswered);
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:rejected", handleEnd);
    socket.on("call:ended", handleEnd);

    return () => {
      socket.off("call:incoming", handleIncoming);
      socket.off("call:answered", handleAnswered);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:rejected", handleEnd);
      socket.off("call:ended", handleEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, callStatus]);

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
        switchCamera: webrtc.switchCamera,
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
