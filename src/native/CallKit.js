import { NativeModules, Platform } from "react-native";

const { CallKitManager } = NativeModules;

export function showIncomingCall(caller = "Unknown Caller") {
  if (Platform.OS !== "ios") {
    console.warn("[CallKit] iOS only");
    return;
  }

  if (!CallKitManager) {
    console.error("[CallKit] Native module not linked");
    return;
  }

  CallKitManager.showIncomingCall(caller);
}
