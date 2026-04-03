import TwilioVoice from "react-native-twilio-programmable-voice";
import { AppState, Platform } from "react-native";
import { fetchVoiceToken } from "./voiceTokenService";
import { getBarber } from "../auth/barberStorage";

let didInit = false;
let listenersAttached = false;
let deviceReadySeen = false;
let initRetryAttempted = false;
let appStateListenerAttached = false;
let currentAppState = AppState.currentState || "active";
let deviceReadyWatchdog = null;
const queuedInvites = [];
const incomingInviteSubscribers = new Set();
const inviteCancelledSubscribers = new Set();

function resolveCallSid(payload) {
  return payload?.call_sid || payload?.callSid || payload?.CallSid || null;
}

function isForegroundAppState(state) {
  return state === "active";
}

function logVoipDiag({ payload = null, hasInvite = false } = {}) {
  const callSid = resolveCallSid(payload);
  const isForeground = isForegroundAppState(currentAppState);
  console.log("[VOIP_DIAG]", {
    appState: currentAppState,
    deviceReady: deviceReadySeen,
    hasInvite,
    callSid,
    isForeground,
  });
}

function attachAppStateDiagnosticsOnce() {
  if (appStateListenerAttached) return;
  appStateListenerAttached = true;

  AppState.addEventListener("change", (nextState) => {
    const prevState = currentAppState;
    currentAppState = nextState;
    console.log("[VOIP] app state transition", { from: prevState, to: nextState });
    logVoipDiag();
  });
}

function emitQueuedInvitesIfNeeded() {
  if (!deviceReadySeen || queuedInvites.length === 0) return;

  const queued = queuedInvites.splice(0, queuedInvites.length);
  console.log("[VOIP] processing queued invites after deviceReady", { count: queued.length });
  queued.forEach((payload) => emitIncomingInvite(payload));
}

function markDeviceReadyAndFlush(source) {
  if (deviceReadySeen) return;
  deviceReadySeen = true;
  console.log(`[VOIP] ✅ device ready via ${source}`);
  logVoipDiag();
  emitQueuedInvitesIfNeeded();
}

function scheduleDeviceReadyWatchdog(accessToken, timeoutMs = 10000) {
  if (deviceReadyWatchdog) {
    clearTimeout(deviceReadyWatchdog);
  }
  deviceReadyWatchdog = setTimeout(async () => {
    if (!deviceReadySeen) {
      console.log("[VOIP] ⚠️ deviceReady did not fire within expected window");
      logVoipDiag();

      if (!initRetryAttempted) {
        initRetryAttempted = true;
        console.log("[VOIP] retrying initWithToken once due to missing deviceReady");
        try {
          const retryResult = await TwilioVoice.initWithToken(accessToken);
          console.log("[VOIP] retry initWithToken resolved", retryResult || {});
          if (retryResult?.initialized) {
            markDeviceReadyAndFlush("retry_init_result");
          }
        } catch (error) {
          console.log("[VOIP] ❌ retry initWithToken failed", error?.message || error, error);
        }
      }
    }
  }, timeoutMs);
}

function emitIncomingInvite(payload) {
  incomingInviteSubscribers.forEach((subscriber) => {
    try {
      subscriber(payload);
    } catch (error) {
      console.log("[VOIP] incoming subscriber error", error?.message || error);
    }
  });
}

function emitInviteCancelled(payload) {
  inviteCancelledSubscribers.forEach((subscriber) => {
    try {
      subscriber(payload);
    } catch (error) {
      console.log("[VOIP] cancelled subscriber error", error?.message || error);
    }
  });
}

function attachTwilioVoipListenersOnce() {
  if (listenersAttached) {
    return;
  }
  listenersAttached = true;

  TwilioVoice.addEventListener("deviceReady", () => {
    console.log("[VOIP] deviceReady fired");
    console.log("[VOIP] ✅ deviceReady (VoIP push registered)");
    markDeviceReadyAndFlush("deviceReady_event");
  });

  TwilioVoice.addEventListener("deviceNotReady", (payload) => {
    deviceReadySeen = false;
    console.log("[VOIP] ❌ deviceNotReady", payload);
    logVoipDiag();
  });

  TwilioVoice.addEventListener("deviceDidReceiveIncoming", (payload) => {
    const callSid = resolveCallSid(payload);
    const isForeground = isForegroundAppState(currentAppState);
    const contextLabel = isForeground ? "foreground" : "background_or_locked";
    console.log("[VOIP] incoming call received", payload);
    console.log("[VOIP] 📞 incoming call invite", payload);
    console.log("[VOIP] incoming invite context", contextLabel);
    console.log("[VOIP] invite call_sid mapping", {
      call_sid: payload?.call_sid || null,
      callSid: payload?.callSid || null,
      CallSid: payload?.CallSid || null,
      resolvedCallSid: callSid,
    });
    logVoipDiag({ payload, hasInvite: true });

    if (!deviceReadySeen) {
      queuedInvites.push(payload);
      console.log("[VOIP] incoming invite queued until deviceReady", { queuedCount: queuedInvites.length, callSid });
      return;
    }

    emitIncomingInvite(payload);
  });

  TwilioVoice.addEventListener("connectionDidConnect", (payload) => {
    console.log("[VOIP] call connected", payload);
  });

  TwilioVoice.addEventListener("connectionDidDisconnect", (payload) => {
    console.log("[VOIP] call disconnected", payload);
  });

  TwilioVoice.addEventListener("callInviteCancelled", (payload) => {
    console.log("[VOIP] ❌ callInviteCancelled", payload);
    logVoipDiag({ payload, hasInvite: false });
    emitInviteCancelled(payload);
  });
}

export async function initVoipPushAndRegisterOnce() {
  attachAppStateDiagnosticsOnce();
  attachTwilioVoipListenersOnce();

  if (didInit) {
    return;
  }
  didInit = true;

  try {
    console.log("[VOIP] fetching voice jwt for Twilio init");
    const { token: accessToken, identity: tokenIdentity } = await fetchVoiceToken();
    const barber = await getBarber();
    const barberId = barber?._id || barber?.id || null;
    console.log("[VOIP] fetched voice jwt");
    console.log("[VOIP_IDENTITY_CHECK]", {
      barberId,
      tokenIdentity,
      matches: barberId && tokenIdentity ? barberId === tokenIdentity : null,
    });

    if (Platform.OS === "ios") {
      console.log("[VOIP] configuring CallKit defaults");
      TwilioVoice.configureCallKit({
        appName: "Glō",
        includesCallsInRecents: false,
      });
      console.log("[VOIP] CallKit configured");
    }

    console.log("[VOIP] initializing Twilio Voice with access token");
    console.log("[VOIP] initWithToken starting");
    try {
      const result = await TwilioVoice.initWithToken(accessToken);
      console.log("[VOIP] initWithToken resolved", result || {});
      console.log("[VOIP_DIAG_NATIVE]", TwilioVoice);
      if (result?.initialized) {
        deviceReadySeen = true;
        console.log("[VOIP] device ready via init_result");
        markDeviceReadyAndFlush("init_result");
      }
    } catch (error) {
      console.log("[VOIP] ❌ initWithToken threw", error?.message || error, error);
      throw error;
    }

    scheduleDeviceReadyWatchdog(accessToken, 10000);
  } catch (error) {
    console.log("[VOIP] ❌ VoIP init failed", error?.message || error);
    throw error;
  }
}

export function isVoipPushInitialized() {
  return didInit;
}

export function isVoipDeviceReady() {
  return deviceReadySeen;
}

export function onVoipIncomingInvite(handler) {
  incomingInviteSubscribers.add(handler);

  return () => {
    incomingInviteSubscribers.delete(handler);
  };
}

export function onVoipInviteCancelled(handler) {
  inviteCancelledSubscribers.add(handler);

  return () => {
    inviteCancelledSubscribers.delete(handler);
  };
}

export async function acceptIncomingInvite() {
  return Promise.resolve(TwilioVoice.accept());
}

export async function rejectOrIgnoreIncomingInvite() {
  try {
    return await Promise.resolve(TwilioVoice.reject());
  } catch (rejectError) {
    console.log("[VOIP] reject failed, trying ignore", rejectError?.message || rejectError);
    return Promise.resolve(TwilioVoice.ignore());
  }
}
