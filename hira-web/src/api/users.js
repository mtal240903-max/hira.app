import api from "./client";

export async function updateProfile({ name, bio, avatarUrl }) {
  const { data } = await api.put("/users/me", { name, bio, avatarUrl });
  return data.user;
}

export async function getContacts() {
  const { data } = await api.get("/users/contacts");
  return data.contacts;
}

export async function addContact(userId) {
  const { data } = await api.post(`/users/contacts/${userId}`);
  return data;
}
