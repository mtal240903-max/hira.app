import api from "./client";

export async function getStatuses() {
  const { data } = await api.get("/status");
  return data.groups;
}

export async function createStatus({ type, content, backgroundColor, media }) {
  const { data } = await api.post("/status", { type, content, backgroundColor, media });
  return data.status;
}

export async function viewStatus(statusId) {
  await api.post(`/status/${statusId}/view`);
}

export async function deleteStatus(statusId) {
  await api.delete(`/status/${statusId}`);
}

export async function updateProfile({ name, bio, avatarUrl }) {
  const { data } = await api.put("/users/me", { name, bio, avatarUrl });
  return data.user;
}

export async function registerPushToken(token, platform) {
  await api.post("/users/push-token", { token, platform });
}
