import { useState, useRef } from "react";
import { View, TextInput, FlatList, Pressable, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "../context/ThemeContext";
import Avatar from "../components/Avatar";
import * as conversationsApi from "../api/conversations";
import { radius } from "../theme/colors";

export default function NewChatScreen({ navigation }) {
  const { theme } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef(null);

  const handleChange = (value) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        setResults(await conversationsApi.searchUsers(value.trim()));
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSelect = async (targetUser) => {
    const conversation = await conversationsApi.getOrCreatePrivateConversation(targetUser.id);
    navigation.replace("Chat", { conversation });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgApp }]}>
      <View style={[styles.header, { borderColor: theme.borderSubtle }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Nouvelle discussion</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: theme.textSecondary, fontSize: 18 }}>✕</Text>
        </Pressable>
      </View>

      <TextInput
        style={[styles.search, { backgroundColor: theme.bgSurface, borderColor: theme.borderDefault, color: theme.textPrimary }]}
        placeholder="Rechercher par nom, email ou téléphone..."
        placeholderTextColor={theme.textTertiary}
        value={query}
        onChangeText={handleChange}
        autoFocus
      />

      {isSearching && <ActivityIndicator style={{ marginTop: 20 }} />}

      <FlatList
        data={results}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => (
          <Pressable style={styles.resultItem} onPress={() => handleSelect(item)}>
            <Avatar name={item.name} avatarUrl={item.avatarUrl} size={42} />
            <View>
              <Text style={{ color: theme.textPrimary, fontWeight: "600" }}>{item.name}</Text>
              <Text style={{ color: theme.textTertiary, fontSize: 12 }}>{item.email || item.phone}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 54 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 17, fontWeight: "700" },
  search: { margin: 16, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  resultItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
});
