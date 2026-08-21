import axios from "axios";

// Utilise l'URL de Render par défaut si aucune variable d'environnement n'est définie
const BASE_URL = import.meta.env.VITE_API_URL || "https://hira-app.onrender.com/api";

const api = axios.create({ baseURL: BASE_URL });

// Injecte l'access token sur chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("hira_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si le serveur répond 401 (token expiré), on tente un refresh une seule fois
// puis on rejoue la requête originale. Si le refresh échoue, on déconnecte.
let isRefreshing = false;
let pendingQueue = [];

function processQueue(error, token = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Une autre requête a déjà lancé le refresh : on attend son résultat
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem("hira_refresh_token");
    if (!refreshToken) {
      isRefreshing = false;
      localStorage.removeItem("hira_access_token");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
      localStorage.setItem("hira_access_token", data.accessToken);
      processQueue(null, data.accessToken);
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      localStorage.removeItem("hira_access_token");
      localStorage.removeItem("hira_refresh_token");
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;