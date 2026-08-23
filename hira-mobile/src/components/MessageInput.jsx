import { useState, useRef } from "react";
import { View, TextInput, Pressable, Text, StyleSheet } from "react-native";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useTheme } from "../context/ThemeContext";
import { BRAND, radius } from "../theme/colors";

export default function MessageInput({ onSend, onFileSelect, onVoiceRecorded, onTypingStart, onTypingStop }) {
  const { theme } = useTheme();
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const typingTimeout = useRef(null);

  const handleChangeText = (value) => {
    setText(value);
    onTypingStart?.();
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTypingStop?.(), 1500);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
    onTypingStop?.();
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      onFileSelect({
        uri: asset.uri,
        name: asset.fileName || `media-${Date.now()}.${asset.uri.split(".").pop()}`,
        mimeType: asset.mimeType || (asset.type === "video" ? "video/mp4" : "image/jpeg"),
      });
    }
  };

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      onFileSelect({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") return;

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
      setIsRecording(true);
    } catch (err) {
      console.error("Erreur démarrage enregistrement :", err.message);
    }
  };

  const stopRecording = async (cancel = false) => {
    if (!recording) return;
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);

    if (!cancel && uri) {
      onVoiceRecorded({ uri, name: `vocal-${Date.now()}.m4a`, mimeType: "audio/m4a" });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]}>
      {isRecording ? (
        <View style={[styles.recording, { backgroundColor: theme.bgApp, borderColor: theme.borderDefault }]}>
          <Pressable onPress={() => stopRecording(true)}>
            <Text style={{ color: theme.danger, fontSize: 18 }}>🗑</Text>
          </Pressable>
          <View style={styles.recordingDot} />
          <Text style={{ color: theme.textPrimary, fontWeight: "600" }}>Enregistrement...</Text>
        </View>
      ) : (
        <>
          <Pressable onPress={handlePickDocument} style={styles.iconBtn}>
            <Text style={{ fontSize: 18 }}>📎</Text>
          </Pressable>
          <Pressable onPress={handlePickImage} style={styles.iconBtn}>
            <Text style={{ fontSize: 18 }}>📷</Text>
          </Pressable>
          <TextInput
            style={[styles.input, { backgroundColor: theme.bgApp, borderColor: theme.borderDefault, color: theme.textPrimary }]}
            placeholder="Écris un message..."
            placeholderTextColor={theme.textTertiary}
            value={text}
            onChangeText={handleChangeText}
            multiline
          />
        </>
      )}

      {text.trim() && !isRecording ? (
        <Pressable onPress={handleSend} style={[styles.sendBtn, { backgroundColor: BRAND.blue }]}>
          <Text style={{ color: "#fff", fontSize: 16 }}>➤</Text>
        </Pressable>
      ) : (
        <Pressable
          onPressIn={startRecording}
          onPressOut={() => stopRecording(false)}
          style={[styles.sendBtn, { backgroundColor: isRecording ? theme.danger : BRAND.blue }]}
        >
          <Text style={{ fontSize: 16 }}>🎤</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 10, borderTopWidth: 1 },
  iconBtn: { padding: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9, maxHeight: 100, fontSize: 15 },
  sendBtn: { width: 42, height: 42, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  recording: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11 },
  recordingDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#ef4444" },
});
