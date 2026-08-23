import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Linking,
} from "react-native";
import * as Linking2 from "expo-linking";
import Constants from "expo-constants";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Button from "../components/Button";
import { BRAND, radius } from "../theme/colors";
import logo from "../assets/hira-logo.png";

export default function AuthScreen() {
  const { theme } = useTheme();
  const { login, signup } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", identifier: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignup = mode === "signup";

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      if (isSignup) {
        const isEmail = form.identifier.includes("@");
        await signup({
          name: form.name,
          password: form.password,
          email: isEmail ? form.identifier : undefined,
          phone: isEmail ? undefined : form.identifier,
        });
      } else {
        await login({ identifier: form.identifier, password: form.password });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Une erreur est survenue, réessaie.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Connexion via Wuro'en : redirige vers la passerelle web, qui renvoie
  // ensuite vers cette app via un deep link hira://auth/wuroen?token=...
  const handleWuroenConnect = async () => {
    const wuroenConnectUrl =
      Constants.expoConfig?.extra?.wuroenConnectUrl ||
      "https://wuroen-app.onrender.com/api/auth/connect";
    const redirectUri = Linking2.createURL("auth/wuroen");
    const url = `${wuroenConnectUrl}?redirect_uri=${encodeURIComponent(redirectUri)}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) Linking.openURL(url);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bgApp }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]}>
          <View style={styles.brand}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.tagline, { color: theme.textSecondary }]}>Discutez sans limites</Text>
          </View>

          <View style={[styles.tabs, { backgroundColor: theme.bgApp, borderColor: theme.borderSubtle }]}>
            <Pressable
              style={[styles.tab, !isSignup && { backgroundColor: BRAND.blue }]}
              onPress={() => setMode("login")}
            >
              <Text style={[styles.tabText, { color: !isSignup ? "#fff" : theme.textSecondary }]}>Connexion</Text>
            </Pressable>
            <Pressable
              style={[styles.tab, isSignup && { backgroundColor: BRAND.blue }]}
              onPress={() => setMode("signup")}
            >
              <Text style={[styles.tabText, { color: isSignup ? "#fff" : theme.textSecondary }]}>Créer un compte</Text>
            </Pressable>
          </View>

          <View style={styles.form}>
            {isSignup && (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Nom</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.bgApp, borderColor: theme.borderDefault, color: theme.textPrimary }]}
                  placeholder="Ton nom complet"
                  placeholderTextColor={theme.textTertiary}
                  value={form.name}
                  onChangeText={(v) => handleChange("name", v)}
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Email ou téléphone</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.bgApp, borderColor: theme.borderDefault, color: theme.textPrimary }]}
                placeholder="toi@exemple.com ou +229..."
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="none"
                keyboardType="email-address"
                value={form.identifier}
                onChangeText={(v) => handleChange("identifier", v)}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Mot de passe</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.bgApp, borderColor: theme.borderDefault, color: theme.textPrimary }]}
                placeholder="••••••••"
                placeholderTextColor={theme.textTertiary}
                secureTextEntry
                value={form.password}
                onChangeText={(v) => handleChange("password", v)}
              />
            </View>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: "rgba(239,68,68,0.08)" }]}>
                <Text style={{ color: theme.danger, fontSize: 13 }}>{error}</Text>
              </View>
            ) : null}

            <Button onPress={handleSubmit} loading={isSubmitting} fullWidth>
              {isSignup ? "Créer mon compte" : "Se connecter"}
            </Button>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.borderSubtle }]} />
              <Text style={{ color: theme.textTertiary, fontSize: 12 }}>ou</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.borderSubtle }]} />
            </View>

            <Button variant="secondary" onPress={handleWuroenConnect} fullWidth>
              Continuer avec Wuro'en
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", padding: 20 },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 24 },
  brand: { alignItems: "center", marginBottom: 24 },
  logo: { width: 84, height: 84, marginBottom: 6 },
  tagline: { fontSize: 13 },
  tabs: { flexDirection: "row", borderRadius: radius.md, padding: 4, borderWidth: 1, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: radius.sm, alignItems: "center" },
  tabText: { fontWeight: "700", fontSize: 13 },
  form: { gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600" },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  errorBox: { borderRadius: radius.sm, padding: 10 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1 },
});
