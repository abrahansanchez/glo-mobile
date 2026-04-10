import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState } from "react-native";
import TwilioVoice from "react-native-twilio-programmable-voice";
import api from "../config/api";
import { AuthContext } from "../auth/authContext";
import {
  acceptIncomingInvite,
  isVoipDeviceReady,
  onVoipIncomingInvite,
  onVoipInviteCancelled,
  rejectOrIgnoreIncomingInvite,
} from "./voipPushService";

const CallManagerContext = createContext(null);

export function CallManagerProvider({ children }) {
  const { barber } = useContext(AuthContext);
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const appStateRef = useRef(AppState.currentState || "active");
  const inFlightActionRef = useRef(null);
  const pendingInviteRef = useRef(null);

  const getCallSid = useCallback((invite) => invite?.call_sid || invite?.callSid || invite?.CallSid || null, []);
  const inviteKey = useCallback((invite) => getCallSid(invite) || invite?.from || invite?.call_from || "unknown", [getCallSid]);
  const resolvePreferredLanguage = useCallback(() => {
    const raw =
      barber?.preferredLanguage ||
      barber?.languagePreference ||
      barber?.language ||
      barber?.locale ||
      "";
    const normalized = String(raw).toLowerCase().trim();
    if (normalized.startsWith("es")) return "es";
    if (normalized.startsWith("en")) return "en";
    return null;
  }, [barber]);

  const logVoipDiag = useCallback(
    (invite, hasInvite) => {
      const callSid = getCallSid(invite);
      const state = appStateRef.current;
      console.log("[VOIP_DIAG]", {
        appState: state,
        deviceReady: isVoipDeviceReady(),
        hasInvite,
        callSid,
        isForeground: state === "active",
      });
    },
    [getCallSid]
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;
      console.log("[CALL_UI] app state transition", { from: previousState, to: nextState });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const unsubscribeIncoming = onVoipIncomingInvite((payload) => {
      const isForeground = appStateRef.current === "active";
      console.log(`[CALL_UI_ROUTE] ${isForeground ? "foreground_overlay" : "background_native"}`);
      logVoipDiag(payload, true);
      pendingInviteRef.current = payload;

      if (!isForeground) {
        return;
      }

      console.log("[CALL_UI] incoming invite received (foreground)");
      setIncomingInvite(payload || null);
    });

    const unsubscribeCancelled = onVoipInviteCancelled((payload) => {
      logVoipDiag(payload, false);
      setIncomingInvite(null);
    });

    return () => {
      unsubscribeIncoming();
      unsubscribeCancelled();
    };
  }, [logVoipDiag]);

  const answerIncomingCall = useCallback(async () => {
    if (!incomingInvite && !pendingInviteRef.current) {
      return;
    }
    if (actionInProgress) {
      return;
    }

    const invite = incomingInvite || pendingInviteRef.current;
    const actionKey = `answer:${inviteKey(invite)}`;
    if (inFlightActionRef.current === actionKey) {
      console.log("[CALL_UI] answer ignored: action already in flight", { actionKey });
      return;
    }

    console.log("[CALL_UI] Answer pressed — accepting immediately");
    inFlightActionRef.current = actionKey;
    setActionInProgress(true);
    try {
      TwilioVoice.accept();
      console.log("[CALL_UI] TwilioVoice.accept() called");
      pendingInviteRef.current = null;
      logVoipDiag(invite, false);
      setIncomingInvite(null);
    } catch (error) {
      console.log("[CALL_UI] answer failed", error?.response?.data || error?.message || error);
      Alert.alert("Unable to answer", "We could not answer the call. Please try again.");
    } finally {
      setActionInProgress(false);
      inFlightActionRef.current = null;
    }
  }, [actionInProgress, incomingInvite, inviteKey, logVoipDiag]);

  const letAiHandleIncomingCall = useCallback(async () => {
    if (!incomingInvite || actionInProgress) {
      return;
    }
    const actionKey = `ai:${inviteKey(incomingInvite)}`;
    if (inFlightActionRef.current === actionKey) {
      console.log("[CALL_UI] AI handle ignored: action already in flight", { actionKey });
      return;
    }

    console.log("[CALL_UI] Let AI Handle pressed");
    inFlightActionRef.current = actionKey;
    setActionInProgress(true);
    let aiTakeoverOk = false;
    let backendStatus = null;
    const callSid = getCallSid(incomingInvite);
    const preferredLanguage = resolvePreferredLanguage();

    try {
      const response = await api.post("/voice/ai-takeover", {
        callSid,
        from: incomingInvite?.call_from || incomingInvite?.from || null,
        to: incomingInvite?.call_to || incomingInvite?.to || null,
        preferredLanguage,
      });
      backendStatus = response?.status || 200;
      aiTakeoverOk = true;
    } catch (error) {
      backendStatus = error?.response?.status || null;
      console.log("[CALL_UI] ai takeover failed", error?.response?.data || error?.message || error);
      Alert.alert("AI takeover failed", "Could not send this call to AI. You can try again or answer the call.");
    } finally {
      console.log("[AI_HANDLE_RESULT]", {
        ok: aiTakeoverOk,
        status: backendStatus,
        callSid,
        preferredLanguage: preferredLanguage || "unset",
      });
    }

    if (!aiTakeoverOk) {
      setActionInProgress(false);
      inFlightActionRef.current = null;
      return;
    }

    try {
      await rejectOrIgnoreIncomingInvite();
      logVoipDiag(incomingInvite, false);
      setIncomingInvite(null);
    } catch (error) {
      console.log("[CALL_UI] local invite dismiss failed", error?.message || error);
    } finally {
      setActionInProgress(false);
      inFlightActionRef.current = null;
    }
  }, [actionInProgress, getCallSid, incomingInvite, inviteKey, logVoipDiag, resolvePreferredLanguage]);

  const value = useMemo(
    () => ({
      incomingInvite,
      actionInProgress,
      answerIncomingCall,
      letAiHandleIncomingCall,
    }),
    [actionInProgress, answerIncomingCall, incomingInvite, letAiHandleIncomingCall]
  );

  return <CallManagerContext.Provider value={value}>{children}</CallManagerContext.Provider>;
}

export function useCallManager() {
  const context = useContext(CallManagerContext);
  if (!context) {
    throw new Error("useCallManager must be used within a CallManagerProvider");
  }

  return context;
}
