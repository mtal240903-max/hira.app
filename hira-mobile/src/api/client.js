import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// En développement, utilise la variable d'environnement définie dans app.json (extra.apiUrl).
const BASE_URL =
  Constants.expoConfig?.extra?.apiUrl || "http://localhost:5000/api";

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("hira_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = await AsyncStorage.getItem("hira_refresh_token");
    if (!refreshToken) {
      isRefreshing = false;
      await AsyncStorage.multiRemove(["hira_access_token", "hira_refresh_token", "hira_user"]);
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
      await AsyncStorage.setItem("hira_access_token", data.accessToken);
      processQueue(null, data.accessToken);
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      await AsyncStorage.multiRemove(["hira_access_token", "hira_refresh_token", "hira_user"]);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export { BASE_URL };
export default api;
