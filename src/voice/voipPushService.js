import TwilioVoice from "react-native-twilio-programmable-voice";
import { Platform } from "react-native";
import { fetchVoiceToken } from "./voiceTokenService";

let didInit = false;
let listenersAttached = false;
let deviceReadySeen = false;
const incomingInviteSubscribers = new Set();
const inviteCancelledSubscribers = new Set();

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
    deviceReadySeen = true;
    console.log("[VOIP] ✅ deviceReady (VoIP push registered)");
  });

  TwilioVoice.addEventListener("deviceNotReady", (payload) => {
    console.log("[VOIP] ❌ deviceNotReady", payload);
  });

  TwilioVoice.addEventListener("deviceDidReceiveIncoming", (payload) => {
    console.log("[VOIP] 📞 incoming call invite", payload);
    emitIncomingInvite(payload);
  });

  TwilioVoice.addEventListener("callInviteCancelled", (payload) => {
    console.log("[VOIP] ❌ callInviteCancelled", payload);
    emitInviteCancelled(payload);
  });
}

export async function initVoipPushAndRegisterOnce() {
  if (didInit) {
    return;
  }
  didInit = true;

  try {
    console.log("[VOIP] fetching voice jwt for Twilio init");
    const { token: accessToken } = await fetchVoiceToken();
    console.log("[VOIP] fetched voice jwt");

    attachTwilioVoipListenersOnce();

    if (Platform.OS === "ios") {
      console.log("[VOIP] configuring CallKit defaults");
      TwilioVoice.configureCallKit({
        appName: "Glō",
        includesCallsInRecents: false,
      });
      console.log("[VOIP] CallKit configured");
    }

    console.log("[VOIP] initializing Twilio Voice with access token");
    await TwilioVoice.initWithToken(accessToken);
    console.log("[VOIP] Twilio initWithToken invoked");

    setTimeout(() => {
      if (!deviceReadySeen) {
        console.log("[VOIP] ⚠️ deviceReady not fired yet (still waiting)");
      }
    }, 10000);
  } catch (error) {
    console.log("[VOIP] ❌ VoIP init failed", error?.message || error);
    throw error;
  }
}

export function isVoipPushInitialized() {
  return didInit;
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
