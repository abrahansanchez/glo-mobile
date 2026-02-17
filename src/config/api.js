import axios from "axios";
import { getToken, clearToken } from "../auth/tokenStorage";
import { getBarber } from "../auth/barberStorage";
import { emitUnauthorized, emitSubscriptionRequired } from "../auth/authEvents";

const api = axios.create({
  baseURL: "https://glo-backend-yaho.onrender.com/api",
  timeout: 15000,
});

console.log("[API] baseURL:", api.defaults.baseURL);

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

    // Log all error details for debugging
    console.log("[SUB_GUARD]", {
      url: error?.config?.url,
      method: error?.config?.method,
      status: error?.response?.status,
      code: errorCode,
      message: error?.response?.data?.message,
    });
    try {
      const Analytics = require("../utils/Analytics").default;
      Analytics.trackError(new Error("API error"), { url: error?.config?.url, status, code: errorCode });
    } catch (e) {}

    // Auth expired / invalid
    if (status === 401) {
        await clearToken();
        try {
          emitUnauthorized();
        } catch (e) {}
    }

    // Subscription-related errors — emit event so app can route to subscription gate
    // ONLY emit if code is exactly one of these enum values
    if (
      errorCode === "SUBSCRIPTION_REQUIRED" ||
      errorCode === "SUBSCRIPTION_PAST_DUE" ||
      errorCode === "INCOMPLETE"
    ) {
      try {
        const barber = await getBarber();
        const barberId = barber?.id || barber?._id;
        console.log("[SUB_GUARD] emitting subscription event for code:", errorCode, { barberId });
        emitSubscriptionRequired(errorCode);
      } catch (e) {}
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
