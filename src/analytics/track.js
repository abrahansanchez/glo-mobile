import { Platform } from "react-native";
import Constants from "expo-constants";

let runtimeContext = {};

function generateSessionId() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `sess_${Date.now()}_${rand}`;
}

const SESSION_ID = generateSessionId();

function getAppVersion() {
  return (
    Constants?.expoConfig?.version ||
    Constants?.manifest2?.extra?.expoClient?.version ||
    Constants?.manifest?.version ||
    "unknown"
  );
}

export function setAnalyticsContext(nextContext = {}) {
  runtimeContext = {
    ...runtimeContext,
    ...nextContext,
  };
}

export function track(eventName, props = {}) {
  if (!eventName) return;

  const payload = {
    barberId: runtimeContext?.barberId || null,
    sessionId: SESSION_ID,
    platform: Platform.OS,
    appVersion: getAppVersion(),
    timestamp: new Date().toISOString(),
    ...props,
  };

  if (__DEV__) {
    console.log("[ANALYTICS]", eventName, payload);
    return;
  }

  // Production stub: intentionally no-op until provider is wired.
  if (global?.__analyticsTrackStub && typeof global.__analyticsTrackStub === "function") {
    global.__analyticsTrackStub(eventName, payload);
  }
}
