import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import TwilioVoice from "react-native-twilio-programmable-voice";
import {
  isVoipDeviceReady,
  onVoipIncomingInvite,
  onVoipInviteCancelled,
  onVoipInviteRejected,
  rejectRingingIncomingInvite,
} from "./voipPushService";
import { callSidForInvite, createIncomingInviteLifecycle } from "./incomingInviteLifecycle";

const CallManagerContext = createContext(null);

export function CallManagerProvider({ children }) {
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const appStateRef = useRef(AppState.currentState || "active");

  const getCallSid = useCallback(callSidForInvite, []);

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

  const lifecycleRef = useRef(null);
  if (!lifecycleRef.current) {
    lifecycleRef.current = createIncomingInviteLifecycle({
      answerInvite: async (invite) => {
        console.log("[CALL_UI] Answer pressed — triggering native CallKit answer");
        const { NativeModules } = require("react-native");
        try {
          if (NativeModules.NativeCallKitModule) {
            await NativeModules.NativeCallKitModule.fulfillAnswer(callSidForInvite(invite) || "");
            return { answered: true };
          }
        } catch (error) {
          console.log("[CALL_UI] native answer unavailable, using SDK accept", {
            hasError: !!error,
          });
        }
        await Promise.resolve(TwilioVoice.accept());
        return { answered: true };
      },
      rejectInvite: async (invite) => {
        const callSid = callSidForInvite(invite);
        console.log("[CALL_UI] Decline to AI pressed", { hasCallSid: !!callSid });
        return rejectRingingIncomingInvite(callSid);
      },
      onChange: (state) => {
        setIncomingInvite(state?.invite || null);
        setActionInProgress(state?.status === "answering" || state?.status === "rejecting");
      },
    });
  }
  const lifecycle = lifecycleRef.current;

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
      lifecycle.receive(payload);

      if (!isForeground) {
        return;
      }

      // In foreground, native CallKit UI handles everything
      // Do NOT show JS overlay — Twilio owns the call lifecycle
      console.log("[CALL_UI] foreground call — native CallKit will handle accept");
    });

    const unsubscribeCancelled = onVoipInviteCancelled((payload) => {
      lifecycle.cancel(payload);
    });
    const unsubscribeRejected = onVoipInviteRejected((payload) => {
      lifecycle.cancel(payload);
    });

    return () => {
      unsubscribeIncoming();
      unsubscribeCancelled();
      unsubscribeRejected();
    };
  }, [lifecycle, logVoipDiag]);

  const answerIncomingCall = useCallback(() => lifecycle.answer(), [lifecycle]);

  const letAiHandleIncomingCall = useCallback(async () => {
    const result = await lifecycle.reject();
    if (!result?.ignored) logVoipDiag(null, false);
    return result;
  }, [lifecycle, logVoipDiag]);

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
