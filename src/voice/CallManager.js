import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState } from "react-native";
import TwilioVoice from "react-native-twilio-programmable-voice";
import api from "../config/api";
import { AuthContext } from "../auth/authContext";
import {
  isVoipDeviceReady,
  onVoipIncomingInvite,
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
      console.log(`[CALL_UI_ROUTE] ${isForeground ? "foreground_native_callkit" : "background_native"}`);
      logVoipDiag(payload, true);
      pendingInviteRef.current = payload;

      if (!isForeground) {
        return;
      }

      // In foreground, native CallKit UI handles everything
      // Do NOT show JS overlay — Twilio owns the call lifecycle
      console.log("[CALL_UI] foreground call — native CallKit will handle accept");
      // Explicitly do NOT call setIncomingInvite here
    });

    return () => {
      unsubscribeIncoming();
    };
  }, [logVoipDiag]);

  const answerIncomingCall = useCallback(async () => {
    console.log("[CALL_UI] Answer pressed — triggering native CallKit answer");
    if (!pendingInviteRef.current) {
      console.log("[CALL_UI] ❌ no pending invite");
      return;
    }
    try {
      const { NativeModules } = require("react-native");
      if (NativeModules.NativeCallKitModule) {
        await NativeModules.NativeCallKitModule.fulfillAnswer(
          pendingInviteRef.current?.call_sid || ""
        );
        console.log("[CALL_UI] fulfillAnswer called");
      } else {
        console.log("[CALL_UI] NativeCallKitModule not available — falling back to TwilioVoice.accept()");
        TwilioVoice.accept();
      }
    } catch (err) {
      console.log("[CALL_UI] ❌ answer error", err?.message || err);
      TwilioVoice.accept();
    }
  }, []);

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
