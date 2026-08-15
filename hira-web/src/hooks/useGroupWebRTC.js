import { useRef, useCallback, useState } from "react";

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

// Gère un ensemble de RTCPeerConnection, une par participant (topologie mesh).
export function useGroupWebRTC() {
  const [localStream, setLocalStream] = useState(null);
  // Map userId -> MediaStream distant
  const [remoteStreams, setRemoteStreams] = useState({});
  const peersRef = useRef({}); // userId -> RTCPeerConnection
  const screenTrackRef = useRef(null);

  const getLocalMedia = useCallback(async (callType) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === "video",
    });
    setLocalStream(stream);
    return stream;
  }, []);

  // Crée (ou retourne) la connexion vers un participant précis
  const getOrCreatePeer = useCallback((userId, stream, onIceCandidate) => {
    if (peersRef.current[userId]) return peersRef.current[userId];

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate) onIceCandidate(userId, e.candidate);
    };

    pc.ontrack = (e) => {
      setRemoteStreams((prev) => ({ ...prev, [userId]: e.streams[0] }));
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        removePeer(userId);
      }
    };

    peersRef.current[userId] = pc;
    return pc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Crée une offre à destination d'un participant (utilisé par le nouvel arrivant)
  const createOfferFor = useCallback(
    async (userId, stream, onIceCandidate) => {
      const pc = getOrCreatePeer(userId, stream, onIceCandidate);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      return offer;
    },
    [getOrCreatePeer]
  );

  // Répond à une offre reçue d'un participant
  const createAnswerFor = useCallback(
    async (userId, stream, offer, onIceCandidate) => {
      const pc = getOrCreatePeer(userId, stream, onIceCandidate);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      return answer;
    },
    [getOrCreatePeer]
  );

  const applyAnswerFrom = useCallback(async (userId, answer) => {
    const pc = peersRef.current[userId];
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }, []);

  const addIceCandidateFrom = useCallback(async (userId, candidate) => {
    const pc = peersRef.current[userId];
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("Erreur ajout candidat ICE (groupe) :", err.message);
    }
  }, []);

  const removePeer = useCallback((userId) => {
    const pc = peersRef.current[userId];
    if (pc) {
      pc.close();
      delete peersRef.current[userId];
    }
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
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

  // Partage d'écran : remplace la piste vidéo envoyée à TOUS les participants d'un coup
  const startScreenShare = useCallback(async () => {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getVideoTracks()[0];
    screenTrackRef.current = screenTrack;

    Object.values(peersRef.current).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) sender.replaceTrack(screenTrack);
    });

    // Revenir automatiquement à la caméra si l'utilisateur arrête le partage
    // depuis l'UI native du navigateur plutôt que depuis notre bouton
    screenTrack.onended = () => stopScreenShare();

    return screenStream;
  }, []);

  const stopScreenShare = useCallback(() => {
    if (!localStream) return;
    const cameraTrack = localStream.getVideoTracks()[0];
    if (!cameraTrack) return;

    Object.values(peersRef.current).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) sender.replaceTrack(cameraTrack);
    });

    screenTrackRef.current?.stop();
    screenTrackRef.current = null;
  }, [localStream]);

  const cleanup = useCallback(() => {
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    localStream?.getTracks().forEach((t) => t.stop());
    screenTrackRef.current?.stop();
    setLocalStream(null);
    setRemoteStreams({});
  }, [localStream]);

  return {
    localStream,
    remoteStreams,
    getLocalMedia,
    createOfferFor,
    createAnswerFor,
    applyAnswerFrom,
    addIceCandidateFrom,
    removePeer,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    cleanup,
  };
}
