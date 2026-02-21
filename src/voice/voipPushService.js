import TwilioVoice from "react-native-twilio-programmable-voice";
import { Platform } from "react-native";
import { fetchVoiceToken } from "./voiceTokenService";

let didInit = false;
let listenersAttached = false;
let deviceReadySeen = false;

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
  });

  TwilioVoice.addEventListener("callInviteCancelled", (payload) => {
    console.log("[VOIP] ❌ callInviteCancelled", payload);
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
