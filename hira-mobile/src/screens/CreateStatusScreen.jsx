import { useState } from "react";
import { View, Text, TextInput, Image, Pressable, StyleSheet, Alert } from "react-native";
import { Video } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../context/ThemeContext";
import Button from "../components/Button";
import * as statusApi from "../api/status";
import * as mediaApi from "../api/media";
import { radius } from "../theme/colors";

const COLORS = ["#3B82F6", "#A855F7", "#22D3EE", "#F97316", "#EC4899", "#14B8A6", "#EF4444", "#0A0E1A"];

export default function CreateStatusScreen({ navigation }) {
  const { theme } = useTheme();
  const [mode, setMode] = useState(null);
  const [text, setText] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const handlePickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setFile({
      uri: asset.uri,
      name: `status-${Date.now()}.${asset.uri.split(".").pop()}`,
      mimeType: asset.mimeType || (asset.type === "video" ? "video/mp4" : "image/jpeg"),
      type: asset.type,
    });
    setMode("media");
  };

  const handlePost = async () => {
    setIsPosting(true);
    try {
      if (mode === "text") {
        if (!text.trim()) return;
        await statusApi.createStatus({ type: "text", content: text.trim(), backgroundColor: color });
        navigation.goBack();
      } else if (mode === "media" && file) {
        const { category, media } = await mediaApi.uploadMedia(file);
        await statusApi.createStatus({ type: category, content: caption.trim(), media });
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert("Erreur", "Échec de la publication.");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgApp }]}>
      <View style={[styles.header, { borderColor: theme.borderSubtle }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Nouveau statut</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: theme.textSecondary, fontSize: 18 }}>✕</Text>
        </Pressable>
      </View>

      {!mode && (
        <View style={{ padding: 16, gap: 10 }}>
          <Pressable
            style={[styles.choice, { backgroundColor: theme.bgHover, borderColor: theme.borderSubtle }]}
            onPress={() => setMode("text")}
          >
            <Text style={{ fontSize: 20 }}>Aa</Text>
            <Text style={{ color: theme.textPrimary, fontWeight: "600" }}>Statut texte</Text>
          </Pressable>
          <Pressable
            style={[styles.choice, { backgroundColor: theme.bgHover, borderColor: theme.borderSubtle }]}
            onPress={handlePickMedia}
          >
            <Text style={{ fontSize: 20 }}>📷</Text>
            <Text style={{ color: theme.textPrimary, fontWeight: "600" }}>Photo ou vidéo</Text>
          </Pressable>
        </View>
      )}

      {mode === "text" && (
        <>
          <View style={[styles.preview, { backgroundColor: color }]}>
            <TextInput
              style={styles.textInput}
              placeholder="Écris quelque chose..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={text}
              onChangeText={setText}
              multiline
              autoFocus
              maxLength={500}
            />
          </View>
          <View style={styles.colors}>
            {COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[styles.colorDot, { backgroundColor: c }, color === c && { borderColor: theme.textPrimary, borderWidth: 2 }]}
              />
            ))}
          </View>
        </>
      )}

      {mode === "media" && file && (
        <>
          <View style={styles.preview}>
            {file.type === "video" ? (
              <Video source={{ uri: file.uri }} style={styles.mediaPreview} useNativeControls resizeMode="contain" />
            ) : (
              <Image source={{ uri: file.uri }} style={styles.mediaPreview} resizeMode="contain" />
            )}
          </View>
          <TextInput
            style={[styles.caption, { backgroundColor: theme.bgSurface, borderColor: theme.borderDefault, color: theme.textPrimary }]}
            placeholder="Ajouter une légende (optionnel)..."
            placeholderTextColor={theme.textTertiary}
            value={caption}
            onChangeText={setCaption}
          />
        </>
      )}

      {mode && (
        <View style={styles.footer}>
          <Button variant="secondary" onPress={() => { setMode(null); setFile(null); }} style={{ flex: 1 }}>
            Retour
          </Button>
          <Button onPress={handlePost} loading={isPosting} disabled={mode === "text" && !text.trim()} style={{ flex: 1 }}>
            Publier
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 54 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 17, fontWeight: "700" },
  choice: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: radius.md, borderWidth: 1 },
  preview: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  textInput: { color: "#fff", fontSize: 22, fontWeight: "700", textAlign: "center", width: "100%" },
  colors: { flexDirection: "row", justifyContent: "center", gap: 10, paddingVertical: 16 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  mediaPreview: { width: "100%", height: "100%" },
  caption: { margin: 16, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11 },
  footer: { flexDirection: "row", gap: 10, padding: 16 },
});
