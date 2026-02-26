import { createContext, useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { getToken, saveToken, clearToken } from "./tokenStorage";
import api from "../config/api";
import { setOnUnauthorized, setOnSubscriptionRequired } from "./authEvents";
import { saveBarber, getBarber, clearBarber } from "./barberStorage";
import { initVoipPushAndRegisterOnce } from "../voice/voipPushService";
import {
  registerExpoPushTokenIfNeeded,
  registerProvidedExpoPushTokenIfNeeded,
  setupPushTokenRefreshRegistration,
} from "../notifications/pushNotifications";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [barber, setBarber] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState("unknown");
  const [subscriptionReason, setSubscriptionReason] = useState(null);
  const [stripeCustomerId, setStripeCustomerId] = useState(null);

  const refreshSession = useCallback(async (reason = "manual") => {
    if (!authenticated && reason !== "auth_restore") {
      return null;
    }

    console.log(`[AUTH_REFRESH] start reason=${reason}`);
    let payload = null;
    let response = null;

    try {
      response = await api.get("/auth/me");
      payload = response?.data || {};
    } catch (firstError) {
      try {
        response = await api.get("/barbers/me");
        payload = response?.data || {};
      } catch (secondError) {
        console.log(
          "[AUTH_REFRESH] failed",
          secondError?.response?.data || secondError?.message || secondError
        );
        return null;
      }
    }

    const barberPayload = payload?.barber || payload?.data?.barber || payload?.user || payload?.data || null;
    const nextBarber = barberPayload && (barberPayload.id || barberPayload._id) ? barberPayload : barber;
    const nextSubscriptionStatus =
      payload?.subscriptionStatus ||
      payload?.subscription?.status ||
      payload?.barber?.subscriptionStatus ||
      nextBarber?.subscriptionStatus ||
      "unknown";
    const nextStripeCustomerId =
      payload?.stripeCustomerId ||
      payload?.subscription?.stripeCustomerId ||
      payload?.barber?.stripeCustomerId ||
      nextBarber?.stripeCustomerId ||
      null;

    if (nextBarber) {
      setBarber(nextBarber);
      await saveBarber(nextBarber);
    }
    setSubscriptionStatus(nextSubscriptionStatus);
    setStripeCustomerId(nextStripeCustomerId);
    setSubscriptionReason(null);

    console.log(
      `[AUTH_REFRESH] resolved subscriptionStatus=${nextSubscriptionStatus} stripeCustomerId=${!!nextStripeCustomerId}`
    );
    return {
      subscriptionStatus: nextSubscriptionStatus,
      stripeCustomerId: nextStripeCustomerId,
      raw: payload,
    };
  }, [authenticated, barber]);

  const registerPushTokenWithContext = useCallback(async (reason, providedToken = null) => {
    try {
      console.log(`[PUSH_REGISTER] trigger ${reason}`);
      if (providedToken) {
        await registerProvidedExpoPushTokenIfNeeded(providedToken);
        return;
      }

      await registerExpoPushTokenIfNeeded();
    } catch (error) {
      console.log(
        `[PUSH_REGISTER] trigger failed ${reason}`,
        error?.response?.data || error?.message || error
      );
    }
  }, []);

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
        console.log("[VOIP] init triggered after auth restore");
        initVoipPushAndRegisterOnce();
        registerPushTokenWithContext("auth_restore_success");
        await refreshSession("auth_restore");
      } catch (e) {
        await clearToken();
        await clearBarber();
        try {
          delete api.defaults.headers.common.Authorization;
        } catch (ex) {}
        setBarber(null);
        setAuthenticated(false);
        setSubscriptionStatus("unknown");
        setStripeCustomerId(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshSession, registerPushTokenWithContext]);

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
    setSubscriptionStatus("unknown");
    setStripeCustomerId(barberObj?.stripeCustomerId || null);
    console.log("[VOIP] init triggered after login");
    initVoipPushAndRegisterOnce();
    registerPushTokenWithContext("login_success");
    await refreshSession("login_success");
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
    setStripeCustomerId(null);
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
      setStripeCustomerId(null);
    });

    setOnSubscriptionRequired((code) => {
      const barberId = barber?.id || barber?._id;
      console.log("[SUB_STATUS] set required", { reason: code, barberId });
      setSubscriptionStatus("required");
      setSubscriptionReason(code || "SUBSCRIPTION_REQUIRED");
    });
  }, [barber]);

  useEffect(() => {
    if (!authenticated) {
      return undefined;
    }

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        registerPushTokenWithContext("app_became_active");
      }
    });

    const teardownPushTokenRefresh = setupPushTokenRefreshRegistration((refreshedToken) => {
      registerPushTokenWithContext("token_refresh_event", refreshedToken);
    });

    return () => {
      appStateSub.remove();
      teardownPushTokenRefresh();
    };
  }, [authenticated, registerPushTokenWithContext]);

  return (
    <AuthContext.Provider
      value={{
        authenticated,
        loading,
        barber,
        subscriptionStatus,
        subscriptionReason,
        stripeCustomerId,
        login,
        logout,
        setSubscriptionStatus,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
