import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Avatar from "../components/Avatar";
import Button from "../components/Button";
import * as statusApi from "../api/status";
import * as mediaApi from "../api/media";
import { radius, BRAND } from "../theme/colors";

export default function ProfileScreen({ navigation }) {
  const { user, updateUser, logout } = useAuth();
  const { theme, themeName, toggleTheme } = useTheme();
  const [name, setName] = useState(user.name || "");
  const [bio, setBio] = useState(user.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    setIsUploading(true);
    try {
      const asset = result.assets[0];
      const { media } = await mediaApi.uploadMedia({
        uri: asset.uri,
        name: `avatar-${Date.now()}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
      });
      setAvatarUrl(media.url);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await statusApi.updateProfile({ name, bio, avatarUrl });
      await updateUser(updated);
      navigation.goBack();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgApp }]}>
      <View style={[styles.header, { borderColor: theme.borderSubtle }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Mon profil</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: theme.textSecondary, fontSize: 18 }}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.avatarZone}>
        <Pressable onPress={handlePickAvatar} disabled={isUploading}>
          <Avatar name={name} avatarUrl={avatarUrl} size={92} />
          <Text style={{ color: BRAND.blue, textAlign: "center", marginTop: 8, fontSize: 13, fontWeight: "600" }}>
            {isUploading ? "Envoi..." : "Modifier la photo"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Nom</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.bgSurface, borderColor: theme.borderDefault, color: theme.textPrimary }]}
            value={name}
            onChangeText={setName}
          />
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Bio</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.bgSurface, borderColor: theme.borderDefault, color: theme.textPrimary, height: 80 }]}
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={150}
          />
        </View>

        <Button onPress={handleSave} loading={isSaving} fullWidth>
          Enregistrer
        </Button>

        <Pressable
          onPress={toggleTheme}
          style={[styles.themeRow, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]}
        >
          <Text style={{ color: theme.textPrimary }}>Thème</Text>
          <Text style={{ color: theme.textSecondary }}>{themeName === "dark" ? "Sombre 🌙" : "Clair ☀️"}</Text>
        </Pressable>

        <Button variant="danger" onPress={logout} fullWidth>
          Déconnexion
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 54 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 17, fontWeight: "700" },
  avatarZone: { alignItems: "center", paddingVertical: 24 },
  form: { padding: 16, gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600" },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  themeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderRadius: radius.md, borderWidth: 1 },
});
