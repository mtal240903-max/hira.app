import { useRef, useCallback, useState } from "react";
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
} from "react-native-webrtc";

// ⚠️ Ce hook utilise react-native-webrtc, qui contient du code natif compilé.
// Il NE FONCTIONNE PAS dans Expo Go — il faut un "dev build" (EAS Build ou
// `expo run:android` / `expo run:ios`) pour le tester. Voir le README mobile.

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

export function useWebRTC() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionState, setConnectionState] = useState("new");
  const pcRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  const getLocalMedia = useCallback(async (callType) => {
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: callType === "video" ? { facingMode: "user" } : false,
    });
    setLocalStream(stream);
    return stream;
  }, []);

  const createPeerConnection = useCallback((onIceCandidate) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.addEventListener("icecandidate", (e) => {
      if (e.candidate) onIceCandidate(e.candidate);
    });

    pc.addEventListener("track", (e) => {
      if (e.streams?.[0]) setRemoteStream(e.streams[0]);
    });

    pc.addEventListener("connectionstatechange", () => {
      setConnectionState(pc.connectionState);
    });

    pcRef.current = pc;
    return pc;
  }, []);

  const startCall = useCallback(
    async (callType, onIceCandidate) => {
      const stream = await getLocalMedia(callType);
      const pc = createPeerConnection(onIceCandidate);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      return offer;
    },
    [getLocalMedia, createPeerConnection]
  );

  const answerCall = useCallback(
    async (callType, offer, onIceCandidate) => {
      const stream = await getLocalMedia(callType);
      const pc = createPeerConnection(onIceCandidate);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      pendingCandidatesRef.current.forEach((c) => pc.addIceCandidate(new RTCIceCandidate(c)));
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      return answer;
    },
    [getLocalMedia, createPeerConnection]
  );

  const applyAnswer = useCallback(async (answer) => {
    if (!pcRef.current) return;
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
  }, []);

  const addIceCandidate = useCallback(async (candidate) => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) {
      pendingCandidatesRef.current.push(candidate);
      return;
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("Erreur ajout candidat ICE :", err.message);
    }
  }, []);

  const toggleAudio = useCallback(
    (enabled) => {
      localStream?.getAudioTracks().forEach((t) => (t.enabled = enabled));
    },
    [localStream]
  );

  const toggleVideo = useCallback(
    (enabled) => {
      localStream?.getVideoTracks().forEach((t) => (t.enabled = enabled));
    },
    [localStream]
  );

  // Bascule caméra avant/arrière (spécifique mobile, pas d'équivalent web)
  const switchCamera = useCallback(() => {
    const videoTrack = localStream?.getVideoTracks()[0];
    videoTrack?._switchCamera?.();
  }, [localStream]);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState("closed");
    pendingCandidatesRef.current = [];
  }, [localStream]);

  return {
    localStream,
    remoteStream,
    connectionState,
    startCall,
    answerCall,
    applyAnswer,
    addIceCandidate,
    toggleAudio,
    toggleVideo,
    switchCamera,
    cleanup,
  };
}
