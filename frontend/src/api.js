import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://interview-app-backend-sv88.onrender.com",
  timeout: 30000, // 30 second default timeout; transcription calls override this to 40s
});

// Attach token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-clear stale/expired tokens on 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
    }
    return Promise.reject(error);
  }
);

export default api;
