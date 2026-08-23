import { useState, useRef } from "react";
import { View, TextInput, FlatList, Pressable, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "../context/ThemeContext";
import Avatar from "../components/Avatar";
import Button from "../components/Button";
import * as conversationsApi from "../api/conversations";
import { radius, BRAND } from "../theme/colors";

export default function NewGroupScreen({ navigation }) {
  const { theme } = useTheme();
  const [step, setStep] = useState("members");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const debounceRef = useRef(null);

  const handleChange = (value) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (value.trim().length < 2) return setResults([]);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        setResults(await conversationsApi.searchUsers(value.trim()));
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const toggleUser = (u) => {
    setSelected((prev) => (prev.some((s) => s.id === u.id) ? prev.filter((s) => s.id !== u.id) : [...prev, u]));
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selected.length === 0) return;
    setIsCreating(true);
    try {
      const conversation = await conversationsApi.createGroup(groupName.trim(), selected.map((u) => u.id));
      navigation.replace("Chat", { conversation });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgApp }]}>
      <View style={[styles.header, { borderColor: theme.borderSubtle }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Nouveau groupe</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: theme.textSecondary, fontSize: 18 }}>✕</Text>
        </Pressable>
      </View>

      {step === "members" ? (
        <>
          <TextInput
            style={[styles.search, { backgroundColor: theme.bgSurface, borderColor: theme.borderDefault, color: theme.textPrimary }]}
            placeholder="Rechercher des membres..."
            placeholderTextColor={theme.textTertiary}
            value={query}
            onChangeText={handleChange}
            autoFocus
          />

          {selected.length > 0 && (
            <View style={styles.chips}>
              {selected.map((u) => (
                <Pressable key={u.id} style={[styles.chip, { backgroundColor: BRAND.blue }]} onPress={() => toggleUser(u)}>
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>{u.name} ✕</Text>
                </Pressable>
              ))}
            </View>
          )}

          {isSearching && <ActivityIndicator style={{ marginTop: 12 }} />}

          <FlatList
            data={results}
            keyExtractor={(u) => u.id}
            renderItem={({ item }) => {
              const isSel = selected.some((s) => s.id === item.id);
              return (
                <Pressable
                  style={[styles.resultItem, isSel && { backgroundColor: theme.bgHover }]}
                  onPress={() => toggleUser(item)}
                >
                  <Avatar name={item.name} avatarUrl={item.avatarUrl} size={40} />
                  <Text style={{ color: theme.textPrimary, fontWeight: "600", flex: 1 }}>{item.name}</Text>
                  {isSel && <Text style={{ color: BRAND.blue, fontWeight: "700" }}>✓</Text>}
                </Pressable>
              );
            }}
          />

          <View style={styles.footer}>
            <Button disabled={selected.length === 0} onPress={() => setStep("details")} fullWidth>
              Continuer ({selected.length})
            </Button>
          </View>
        </>
      ) : (
        <View style={{ padding: 16, gap: 14 }}>
          <TextInput
            style={[styles.search, { margin: 0, backgroundColor: theme.bgSurface, borderColor: theme.borderDefault, color: theme.textPrimary }]}
            placeholder="Nom du groupe"
            placeholderTextColor={theme.textTertiary}
            value={groupName}
            onChangeText={setGroupName}
            autoFocus
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button variant="secondary" onPress={() => setStep("members")} style={{ flex: 1 }}>
              Retour
            </Button>
            <Button disabled={!groupName.trim() || isCreating} loading={isCreating} onPress={handleCreate} style={{ flex: 1 }}>
              Créer
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 54 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 17, fontWeight: "700" },
  search: { margin: 16, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 16, paddingBottom: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  resultItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  footer: { padding: 16 },
});
