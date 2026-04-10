import { NativeModules, Platform } from "react-native";

const { NativeCallKitModule } = NativeModules;

export async function reportIncomingCall(callSid, callerName) {
  if (Platform.OS !== "ios" || !NativeCallKitModule) {
    console.warn("[NATIVE_CALLKIT] module not available or not iOS");
    return;
  }
  console.log("[NATIVE_CALLKIT] reporting incoming call", callSid);
  return NativeCallKitModule.reportIncomingCall(callSid, callerName || "Unknown Caller");
}

export async function fulfillAnswer(callSid) {
  if (Platform.OS !== "ios" || !NativeCallKitModule) {
    console.warn("[NATIVE_CALLKIT] module not available or not iOS");
    return;
  }
  console.log("[NATIVE_CALLKIT] fulfilling answer", callSid);
  return NativeCallKitModule.fulfillAnswer(callSid);
}

export async function rejectCallNative(callSid) {
  if (Platform.OS !== "ios" || !NativeCallKitModule) {
    console.warn("[NATIVE_CALLKIT] module not available or not iOS");
    return;
  }
  console.log("[NATIVE_CALLKIT] rejecting call", callSid);
  return NativeCallKitModule.rejectCall(callSid);
}
