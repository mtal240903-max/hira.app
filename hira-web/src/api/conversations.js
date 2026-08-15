import api from "./client";

export async function getMyConversations() {
  const { data } = await api.get("/conversations");
  return data.conversations;
}

export async function getOrCreatePrivateConversation(userId) {
  const { data } = await api.post("/conversations/private", { userId });
  return data.conversation;
}

export async function createGroup(name, memberIds) {
  const { data } = await api.post("/conversations/group", { name, memberIds });
  return data.conversation;
}

export async function addGroupMembers(conversationId, memberIds) {
  const { data } = await api.post(`/conversations/${conversationId}/members`, { memberIds });
  return data.conversation;
}

export async function removeGroupMember(conversationId, userId) {
  const { data } = await api.delete(`/conversations/${conversationId}/members/${userId}`);
  return data.conversation;
}

export async function leaveGroup(conversationId) {
  const { data } = await api.post(`/conversations/${conversationId}/leave`);
  return data;
}

export async function updateGroup(conversationId, { name, avatarUrl }) {
  const { data } = await api.put(`/conversations/${conversationId}`, { name, avatarUrl });
  return data.conversation;
}

export async function getMessages(conversationId, { before, limit = 30 } = {}) {
  const { data } = await api.get(`/conversations/${conversationId}/messages`, {
    params: { before, limit },
  });
  return data.messages;
}

export async function searchUsers(query) {
  const { data } = await api.get("/users/search", { params: { q: query } });
  return data.users;
}
