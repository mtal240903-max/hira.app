import api from "./client";

export async function register({ name, email, phone, password }) {
  const { data } = await api.post("/auth/register", { name, email, phone, password });
  return data;
}

export async function login({ identifier, password }) {
  const { data } = await api.post("/auth/login", { identifier, password });
  return data;
}

export async function loginWithWuroen(wuroenToken) {
  const { data } = await api.post("/auth/wuroen", { wuroenToken });
  return data;
}

export async function logout(refreshToken) {
  const { data } = await api.post("/auth/logout", { refreshToken });
  return data;
}
