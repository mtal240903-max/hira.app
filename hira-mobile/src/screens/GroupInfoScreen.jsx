import { useState } from "react";
import { View, Text, FlatList, Pressable, TextInput, Alert, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Avatar from "../components/Avatar";
import Button from "../components/Button";
import * as conversationsApi from "../api/conversations";
import { radius } from "../theme/colors";

export default function GroupInfoScreen({ route, navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [conversation, setConversation] = useState(route.params.conversation);
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(conversation.name || "");

  const myMembership = conversation.members.find((m) => m.user._id === user.id);
  const isAdmin = myMembership?.role === "admin";

  const handleSaveName = async () => {
    if (!name.trim() || name === conversation.name) return setIsEditingName(false);
    const updated = await conversationsApi.updateGroup(conversation._id, { name: name.trim() });
    setConversation(updated);
    setIsEditingName(false);
  };

  const handleRemoveMember = (userId) => {
    Alert.alert("Retirer ce membre ?", "", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Retirer",
        style: "destructive",
        onPress: async () => {
          const updated = await conversationsApi.removeGroupMember(conversation._id, userId);
          setConversation(updated);
        },
      },
    ]);
  };

  const handleLeave = () => {
    Alert.alert("Quitter ce groupe ?", "Tu ne recevras plus les messages.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Quitter",
        style: "destructive",
        onPress: async () => {
          await conversationsApi.leaveGroup(conversation._id);
          navigation.navigate("ChatList");
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgApp }]}>
      <View style={[styles.header, { borderColor: theme.borderSubtle }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Informations du groupe</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: theme.textSecondary, fontSize: 18 }}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.identity}>
        <Avatar name={conversation.name} avatarUrl={conversation.avatarUrl} size={84} />
        {isEditingName ? (
          <View style={styles.editRow}>
            <TextInput
              style={[styles.nameInput, { color: theme.textPrimary, borderColor: theme.borderDefault }]}
              value={name}
              onChangeText={setName}
              autoFocus
              onSubmitEditing={handleSaveName}
            />
            <Pressable onPress={handleSaveName}>
              <Text style={{ color: theme.textPrimary, fontWeight: "700" }}>OK</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => isAdmin && setIsEditingName(true)}>
            <Text style={[styles.name, { color: theme.textPrimary }]}>
              {conversation.name} {isAdmin && "✎"}
            </Text>
          </Pressable>
        )}
        <Text style={{ color: theme.textTertiary, fontSize: 13 }}>{conversation.members.length} membres</Text>
      </View>

      <FlatList
        data={conversation.members}
        keyExtractor={(m) => m.user._id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item: m }) => (
          <View style={styles.memberRow}>
            <Avatar name={m.user.name} avatarUrl={m.user.avatarUrl} size={40} online={m.user.status === "online"} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.textPrimary, fontWeight: "600" }}>
                {m.user.name} {m.user._id === user.id && "(toi)"}
              </Text>
              {m.role === "admin" && <Text style={{ color: "#a855f7", fontSize: 11, fontWeight: "600" }}>👑 Admin</Text>}
            </View>
            {isAdmin && m.user._id !== user.id && (
              <Pressable onPress={() => handleRemoveMember(m.user._id)}>
                <Text style={{ color: theme.danger, fontSize: 12, fontWeight: "600" }}>Retirer</Text>
              </Pressable>
            )}
          </View>
        )}
      />

      <View style={{ padding: 16 }}>
        <Button variant="danger" onPress={handleLeave} fullWidth>
          Quitter le groupe
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 54 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: "700" },
  identity: { alignItems: "center", gap: 8, paddingVertical: 24 },
  name: { fontSize: 18, fontWeight: "700" },
  editRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  nameInput: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6, fontSize: 15 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: 8 },
});
