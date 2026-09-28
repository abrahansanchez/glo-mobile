import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { getToken, saveToken, clearToken } from "./tokenStorage";
import api from "../config/api";
import { setOnUnauthorized, setOnSubscriptionRequired } from "./authEvents";
import { saveBarber, getBarber, clearBarber } from "./barberStorage";
import {
  initVoipPushAndRegisterOnce,
  invalidateVoipRegistrationSession,
} from "../voice/voipPushService";
import {
  registerExpoPushTokenIfNeeded,
  registerProvidedExpoPushTokenIfNeeded,
  setupPushTokenRefreshRegistration,
} from "../notifications/pushNotifications";
import { setAnalyticsContext } from "../analytics/track";

export const AuthContext = createContext();

function errorDiagnostic(error) {
  return {
    hasError: !!error,
    status: error?.response?.status || null,
    code: error?.code || null,
    name: error?.name || null,
  };
}

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [barber, setBarber] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState("unknown");
  const [subscriptionReason, setSubscriptionReason] = useState(null);
  const [stripeCustomerId, setStripeCustomerId] = useState(null);
  const refreshInFlightRef = useRef(null);

  const refreshSession = useCallback(async (reason = "manual") => {
    if (!authenticated && reason !== "auth_restore") {
      return null;
    }

    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    console.log(`[AUTH_REFRESH] start reason=${reason}`);
    refreshInFlightRef.current = (async () => {
      try {
        const response = await api.get("/billing/status");
        const payload = response?.data || {};

        const nextSubscriptionStatus =
          payload?.subscriptionStatus ||
          payload?.subscription?.status ||
          (payload?.isSubscribed === true ? "active" : "unknown");
        const nextStripeCustomerId =
          payload?.stripeCustomerId ||
          payload?.subscription?.stripeCustomerId ||
          barber?.stripeCustomerId ||
          null;

        setSubscriptionStatus(nextSubscriptionStatus || "unknown");
        setStripeCustomerId(nextStripeCustomerId);
        setSubscriptionReason(null);

        if (barber && nextStripeCustomerId && !barber?.stripeCustomerId) {
          const nextBarber = { ...barber, stripeCustomerId: nextStripeCustomerId };
          setBarber(nextBarber);
          await saveBarber(nextBarber);
        }

        console.log(
          `[AUTH_REFRESH] resolved subscriptionStatus=${nextSubscriptionStatus || "unknown"} stripeCustomerId=${!!nextStripeCustomerId}`
        );
        return {
          subscriptionStatus: nextSubscriptionStatus || "unknown",
          stripeCustomerId: nextStripeCustomerId,
          raw: payload,
        };
      } catch (error) {
        console.log("[AUTH_REFRESH] failed", errorDiagnostic(error));
        return null;
      }
    })();

    try {
      return await refreshInFlightRef.current;
    } finally {
      refreshInFlightRef.current = null;
    }
  }, [authenticated, barber]);

  const registerPushTokenWithContext = useCallback(async (
    reason,
    providedToken = null,
    expectedOwner = null
  ) => {
    try {
      console.log(`[PUSH_REGISTER] trigger ${reason}`);
      if (!expectedOwner) {
        console.log(`[PUSH_REGISTER] skipped ${reason}`, { hasExpectedOwner: false });
        return;
      }
      if (providedToken) {
        await registerProvidedExpoPushTokenIfNeeded(providedToken, expectedOwner);
        return;
      }

      await registerExpoPushTokenIfNeeded(expectedOwner);
    } catch (error) {
      console.log(`[PUSH_REGISTER] trigger failed ${reason}`, errorDiagnostic(error));
    }
  }, []);

  // Restore session on app start
  useEffect(() => {
    (async () => {
      const token = await getToken();
      console.log("[AUTH_RESTORE] token exists?", !!token);

      if (!token) {
        console.log("[AUTH_RESTORE] no token -> authenticated=false, subscriptionStatus reset");
        await clearBarber();
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
        console.log("[AUTH_RESTORE] barber exists?", !!b);
        setBarber(b || null);

        // treat token as valid for now; App will surface subscription issues later
        setAuthenticated(true);
        console.log("[VOIP] init triggered after auth restore");
        initVoipPushAndRegisterOnce("auth_restore", b?._id || b?.id || null).catch((error) => {
          console.log("[VOIP] auth restore init failed", errorDiagnostic(error));
        });
        registerPushTokenWithContext(
          "auth_restore_success",
          null,
          b?._id || b?.id || null
        );
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
  }, []);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    const token = response.data.token;
    invalidateVoipRegistrationSession("login_account_activation");
    await saveToken(token);

    // set authorization header for api
    try {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } catch (e) {}

    // persist barber object if returned
    const barberObj = response.data?.barber || null;
    const authoritativeOwner = barberObj?._id || barberObj?.id || null;
    let persistedOwner = null;
    if (barberObj && authoritativeOwner) {
      await saveBarber(barberObj);
      const persistedBarber = await getBarber();
      persistedOwner = persistedBarber?._id || persistedBarber?.id || null;
      if (String(persistedOwner || "") === String(authoritativeOwner)) {
        setBarber(barberObj);
      } else {
        persistedOwner = null;
        await clearBarber();
        setBarber(null);
        console.log("[AUTH] login profile persistence unavailable", {
          hasAuthoritativeOwner: true,
        });
      }
    } else {
      await clearBarber();
      setBarber(null);
      console.log("[AUTH] login response missing authoritative profile", {
        hasBarber: !!barberObj,
        hasAuthoritativeOwner: false,
      });
    }

    setAuthenticated(true);
    setSubscriptionStatus("unknown");
    setStripeCustomerId(barberObj?.stripeCustomerId || null);
    console.log("[VOIP] init triggered after login");
    initVoipPushAndRegisterOnce("login", barberObj?._id || barberObj?.id || null).catch((error) => {
      console.log("[VOIP] login init failed", errorDiagnostic(error));
    });
    if (persistedOwner) {
      registerPushTokenWithContext("login_success", null, persistedOwner);
    }
    await refreshSession("login_success");
  };

  const logout = async () => {
    console.log("[SUB_STATUS] reset to unknown (logout)");
    invalidateVoipRegistrationSession("logout");
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
      invalidateVoipRegistrationSession("unauthorized");
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
      console.log("[SUB_STATUS] set required", {
        reason: code,
        hasBarber: !!(barber?.id || barber?._id),
      });
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
        registerPushTokenWithContext(
          "app_became_active",
          null,
          barber?._id || barber?.id || null
        );
      }
    });

    const teardownPushTokenRefresh = setupPushTokenRefreshRegistration((refreshedToken) => {
      registerPushTokenWithContext(
        "token_refresh_event",
        refreshedToken,
        barber?._id || barber?.id || null
      );
    });

    return () => {
      appStateSub.remove();
      teardownPushTokenRefresh();
    };
  }, [authenticated, barber, registerPushTokenWithContext]);

  useEffect(() => {
    setAnalyticsContext({
      barberId: barber?.id || barber?._id || null,
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
