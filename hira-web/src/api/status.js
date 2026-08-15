import api from "./client";

export async function getStatuses() {
  const { data } = await api.get("/status");
  return data.groups; // [{ user, statuses: [...] }]
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
