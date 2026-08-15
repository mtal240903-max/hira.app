import { useRef, useCallback, useState } from "react";

// STUN public de Google — gratuit, suffisant pour la majorité des connexions.
// Un serveur TURN sera nécessaire plus tard pour les réseaux très restrictifs
// (double NAT, pare-feu d'entreprise strict) où la connexion directe échoue.
const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

export function useWebRTC() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionState, setConnectionState] = useState("new");
  const pcRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const screenTrackRef = useRef(null);

  const createPeerConnection = useCallback((onIceCandidate) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (e) => {
      if (e.candidate) onIceCandidate(e.candidate);
    };

    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
    };

    pcRef.current = pc;
    return pc;
  }, []);

  const getLocalMedia = useCallback(async (callType) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === "video",
    });
    setLocalStream(stream);
    return stream;
  }, []);

  // Côté appelant : crée l'offre SDP à envoyer au destinataire
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

  // Côté destinataire : reçoit l'offre, répond avec sa propre description
  const answerCall = useCallback(
    async (callType, offer, onIceCandidate) => {
      const stream = await getLocalMedia(callType);
      const pc = createPeerConnection(onIceCandidate);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      // Applique les candidats ICE reçus avant que setRemoteDescription soit prêt
      pendingCandidatesRef.current.forEach((c) => pc.addIceCandidate(new RTCIceCandidate(c)));
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      return answer;
    },
    [getLocalMedia, createPeerConnection]
  );

  // Côté appelant : applique la réponse SDP reçue du destinataire
  const applyAnswer = useCallback(async (answer) => {
    if (!pcRef.current) return;
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
  }, []);

  const addIceCandidate = useCallback(async (candidate) => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) {
      // Pas encore prêt : on garde le candidat pour plus tard
      pendingCandidatesRef.current.push(candidate);
      return;
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("Erreur ajout candidat ICE :", err.message);
    }
  }, []);

  const toggleAudio = useCallback((enabled) => {
    localStream?.getAudioTracks().forEach((t) => (t.enabled = enabled));
  }, [localStream]);

  const toggleVideo = useCallback((enabled) => {
    localStream?.getVideoTracks().forEach((t) => (t.enabled = enabled));
  }, [localStream]);

  // Partage d'écran : remplace la piste vidéo envoyée au pair distant
  const startScreenShare = useCallback(async () => {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getVideoTracks()[0];
    screenTrackRef.current = screenTrack;

    const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === "video");
    if (sender) sender.replaceTrack(screenTrack);

    screenTrack.onended = () => stopScreenShare();
    return screenStream;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopScreenShare = useCallback(() => {
    const cameraTrack = localStream?.getVideoTracks()[0];
    if (!cameraTrack) return;
    const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === "video");
    if (sender) sender.replaceTrack(cameraTrack);
    screenTrackRef.current?.stop();
    screenTrackRef.current = null;
  }, [localStream]);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStream?.getTracks().forEach((t) => t.stop());
    screenTrackRef.current?.stop();
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
    startScreenShare,
    stopScreenShare,
    cleanup,
  };
}
