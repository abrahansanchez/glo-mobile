import axios from "axios";
import { getToken, clearToken } from "../auth/tokenStorage";

const api = axios.create({
  baseURL: "https://glo-backend-yaho.onrender.com/api",
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const errorCode =
      error.response?.data?.error ||
      error.response?.data?.code;

    // Auth expired / invalid
    if (status === 401) {
      await clearToken();
    }

    // Subscription-related errors (handled by UI gate)
    if (
      errorCode === "SUBSCRIPTION_REQUIRED" ||
      errorCode === "SUBSCRIPTION_PAST_DUE" ||
      errorCode === "INCOMPLETE"
    ) {
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;
