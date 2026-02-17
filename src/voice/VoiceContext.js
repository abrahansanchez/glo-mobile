import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { AuthContext } from "../auth/authContext";
import { fetchVoiceToken } from "./voiceTokenService";

export const VoiceContext = createContext();

export function VoiceProvider({ children }) {
  const { authenticated, loading: authLoading } = useContext(AuthContext);

  const [token, setToken] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  const voiceReady = status === "ready";

  const loadToken = useCallback(async () => {
    console.log("[VOICE] loadToken invoked, auth state:", { authenticated });
    if (!authenticated) {
      console.log("[VOICE] user not authenticated — skipping token fetch");
      return;
    }

    try {
      setStatus("initializing");
      setError(null);
      const { token: fetchedToken, identity: fetchedIdentity } = await fetchVoiceToken();
      console.log("[VOICE] token fetched", { hasToken: !!fetchedToken, identity: fetchedIdentity });
      setToken(fetchedToken);
      setIdentity(fetchedIdentity || null);
      setStatus("ready");
    } catch (err) {
      console.log("[VOICE] token fetch error", err?.message || err);
      setError(err?.message || "Failed to fetch voice token");
      setStatus("error");
      setToken(null);
      setIdentity(null);
    }
  }, [authenticated]);

  // On mount / when authenticated changes, try to load token
  useEffect(() => {
    if (authLoading) return; // wait until auth restored
    if (!authenticated) return;
    // attempt initial load
    loadToken();
  }, [authLoading, authenticated, loadToken]);

  const refreshToken = useCallback(async () => {
    console.log("[VOICE] refreshToken called");
    await loadToken();
  }, [loadToken]);

  return (
    <VoiceContext.Provider
      value={{
        voiceReady,
        token,
        identity,
        status,
        error,
        refreshToken,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

export const useVoice = () => {
  return useContext(VoiceContext);
};
