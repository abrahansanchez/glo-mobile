import { createContext, useEffect, useState } from "react";
import { getToken, saveToken, clearToken } from "./tokenStorage";
import api from "../config/api";
import { setOnUnauthorized, setOnSubscriptionRequired } from "./authEvents";
import { saveBarber, getBarber, clearBarber } from "./barberStorage";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [barber, setBarber] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState("unknown");
  const [subscriptionReason, setSubscriptionReason] = useState(null);

  // Restore session on app start
  useEffect(() => {
    (async () => {
      const token = await getToken();
      console.log("[AUTH_RESTORE] token exists?", !!token);

      if (!token) {
        console.log("[AUTH_RESTORE] no token -> authenticated=false, subscriptionStatus reset");
        try {
          delete api.defaults.headers.common.Authorization;
        } catch (e) {}
        setAuthenticated(false);
        setSubscriptionStatus("unknown");
        setLoading(false);
        return;
      }

      try {
        // Set auth header for subsequent requests
        api.defaults.headers.common.Authorization = `Bearer ${token}`;

        // restore barber from secure storage (do NOT call subscription-gated endpoints here)
        const b = await getBarber();
        console.log("[AUTH_RESTORE] barber exists?", !!b, b?.id || b?._id);
        setBarber(b || null);

        // treat token as valid for now; App will surface subscription issues later
        setAuthenticated(true);
      } catch (e) {
        await clearToken();
        await clearBarber();
        try {
          delete api.defaults.headers.common.Authorization;
        } catch (ex) {}
        setBarber(null);
        setAuthenticated(false);
        setSubscriptionStatus("unknown");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    const token = response.data.token;
    await saveToken(token);

    // set authorization header for api
    try {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } catch (e) {}

    // persist barber object if returned
    const barberObj = response.data?.barber || null;
    if (barberObj) {
      await saveBarber(barberObj);
      setBarber(barberObj);
    }

    setAuthenticated(true);
  };

  const logout = async () => {
    console.log("[SUB_STATUS] reset to unknown (logout)");
    await clearToken();
    await clearBarber();
    try {
      delete api.defaults.headers.common.Authorization;
    } catch (e) {}
    setBarber(null);
    setAuthenticated(false);
    setSubscriptionStatus("unknown");
    setSubscriptionReason(null);
  };

  // When API detects a 401, it emits an unauthorized event — handle it here
  useEffect(() => {
    setOnUnauthorized(async () => {
      await clearToken();
      await clearBarber();
      try {
        delete api.defaults.headers.common.Authorization;
      } catch (e) {}
      setBarber(null);
      setAuthenticated(false);
      setSubscriptionStatus("unknown");
      setSubscriptionReason(null);
    });

    setOnSubscriptionRequired((code) => {
      const barberId = barber?.id || barber?._id;
      console.log("[SUB_STATUS] set required", { reason: code, barberId });
      setSubscriptionStatus("required");
      setSubscriptionReason(code || "SUBSCRIPTION_REQUIRED");
    });
  }, [barber]);

  return (
    <AuthContext.Provider
      value={{
        authenticated,
        loading,
        barber,
        subscriptionStatus,
        subscriptionReason,
        login,
        logout,
        setSubscriptionStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
