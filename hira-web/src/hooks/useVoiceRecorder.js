import { useState, useRef, useCallback } from "react";

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startTimeRef = useRef(0);
  const intervalRef = useRef(null);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    startTimeRef.current = Date.now();
    setIsRecording(true);
    setDurationMs(0);

    intervalRef.current = setInterval(() => {
      setDurationMs(Date.now() - startTimeRef.current);
    }, 200);
  }, []);

  // Résout avec un File audio prêt à uploader, ou null si annulé
  const stop = useCallback((cancel = false) => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) return resolve(null);

      recorder.onstop = () => {
        clearInterval(intervalRef.current);
        recorder.stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);

        if (cancel || chunksRef.current.length === 0) return resolve(null);

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `vocal-${Date.now()}.webm`, { type: "audio/webm" });
        resolve(file);
      };

      recorder.stop();
    });
  }, []);

  return { isRecording, durationMs, start, stop };
}
