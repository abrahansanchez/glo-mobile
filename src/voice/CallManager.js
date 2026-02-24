import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import api from "../config/api";
import {
  acceptIncomingInvite,
  onVoipIncomingInvite,
  onVoipInviteCancelled,
  rejectOrIgnoreIncomingInvite,
} from "./voipPushService";

const CallManagerContext = createContext(null);

export function CallManagerProvider({ children }) {
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;
      if (nextState !== "active") {
        setIncomingInvite(null);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const unsubscribeIncoming = onVoipIncomingInvite((payload) => {
      if (appStateRef.current !== "active") {
        return;
      }

      console.log("[CALL_UI] incoming invite received (foreground)");
      setIncomingInvite(payload || null);
    });

    const unsubscribeCancelled = onVoipInviteCancelled(() => {
      setIncomingInvite(null);
    });

    return () => {
      unsubscribeIncoming();
      unsubscribeCancelled();
    };
  }, []);

  const answerIncomingCall = useCallback(async () => {
    if (!incomingInvite || actionInProgress) {
      return;
    }

    console.log("[CALL_UI] Answer pressed");
    setActionInProgress(true);
    try {
      await acceptIncomingInvite();
    } catch (error) {
      console.log("[CALL_UI] answer failed", error?.response?.data || error?.message || error);
    } finally {
      setIncomingInvite(null);
      setActionInProgress(false);
    }
  }, [actionInProgress, incomingInvite]);

  const letAiHandleIncomingCall = useCallback(async () => {
    if (!incomingInvite || actionInProgress) {
      return;
    }

    console.log("[CALL_UI] Let AI Handle pressed");
    setActionInProgress(true);
    try {
      await api.post("/voice/ai-takeover", {
        callSid: incomingInvite?.call_sid || null,
        from: incomingInvite?.call_from || incomingInvite?.from || null,
        to: incomingInvite?.call_to || incomingInvite?.to || null,
      });
    } catch (error) {
      console.log("[CALL_UI] ai takeover failed", error?.response?.data || error?.message || error);
    }

    try {
      await rejectOrIgnoreIncomingInvite();
    } catch (error) {
      console.log("[CALL_UI] local invite dismiss failed", error?.message || error);
    } finally {
      setIncomingInvite(null);
      setActionInProgress(false);
    }
  }, [actionInProgress, incomingInvite]);

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
