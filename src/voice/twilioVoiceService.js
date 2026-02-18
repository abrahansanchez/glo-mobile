import TwilioVoice from "react-native-twilio-programmable-voice";

// Store listeners globally so we can clean them up later
let activeListeners = [];
let connectWaitInterval = null;
let twilioInitialized = false;
let deviceReadyFlag = false;

function ts() {
  return new Date().toISOString();
}

function getTokenIdentity(token) {
  if (!token || typeof token !== "string") {
    return "unknown";
  }

  try {
    const parts = token.split(".");
    if (parts.length < 2) {
      return "unknown";
    }

    const payload = JSON.parse(atob(parts[1]));
    const grants = payload?.grants;
    return payload?.identity || grants?.identity || "unknown";
  } catch {
    return "unknown";
  }
}

function sdkMethodExists(name) {
  return typeof TwilioVoice?.[name] === "function";
}

async function logSdkState(label) {
  const targetGetters = ["isInitialized", "getActiveCall", "getCallState", "getDeviceState"];
  const missingTargetGetters = targetGetters.filter((getterName) => !sdkMethodExists(getterName));

  const hasGetActiveCall = sdkMethodExists("getActiveCall");
  const hasGetCallInvite = sdkMethodExists("getCallInvite");
  const hasIsInitialized = sdkMethodExists("isInitialized");
  const hasGetCallState = sdkMethodExists("getCallState");
  const hasGetDeviceState = sdkMethodExists("getDeviceState");

  if (missingTargetGetters.length > 0) {
    console.log(
      `[TWILIO_VOICE][${label}] [${ts()}] SDK does not expose state getters:`,
      missingTargetGetters
    );
  }

  if (hasGetActiveCall) {
    try {
      const activeCall = await TwilioVoice.getActiveCall();
      console.log(`[TWILIO_VOICE][${label}] [${ts()}] getActiveCall:`, activeCall);
    } catch (e) {
      console.log(`[TWILIO_VOICE][${label}] [${ts()}] getActiveCall error:`, e?.message || e);
    }
  }

  if (hasGetCallInvite) {
    try {
      const callInvite = await TwilioVoice.getCallInvite();
      console.log(`[TWILIO_VOICE][${label}] [${ts()}] getCallInvite:`, callInvite);
    } catch (e) {
      console.log(`[TWILIO_VOICE][${label}] [${ts()}] getCallInvite error:`, e?.message || e);
    }
  }

  if (hasIsInitialized) {
    try {
      const isInitialized = await TwilioVoice.isInitialized();
      console.log(`[TWILIO_VOICE][${label}] [${ts()}] isInitialized:`, isInitialized);
    } catch (e) {
      console.log(`[TWILIO_VOICE][${label}] [${ts()}] isInitialized error:`, e?.message || e);
    }
  }

  if (hasGetCallState) {
    try {
      const callState = await TwilioVoice.getCallState();
      console.log(`[TWILIO_VOICE][${label}] [${ts()}] getCallState:`, callState);
    } catch (e) {
      console.log(`[TWILIO_VOICE][${label}] [${ts()}] getCallState error:`, e?.message || e);
    }
  }

  if (hasGetDeviceState) {
    try {
      const deviceState = await TwilioVoice.getDeviceState();
      console.log(`[TWILIO_VOICE][${label}] [${ts()}] getDeviceState:`, deviceState);
    } catch (e) {
      console.log(`[TWILIO_VOICE][${label}] [${ts()}] getDeviceState error:`, e?.message || e);
    }
  }
}

function startConnectWaitTelemetry() {
  if (connectWaitInterval) {
    clearInterval(connectWaitInterval);
    connectWaitInterval = null;
  }

  let tries = 0;
  connectWaitInterval = setInterval(async () => {
    tries += 1;
    console.log(`[TWILIO_VOICE] [${ts()}] still waiting... (${tries}/5)`);
    await logSdkState("CONNECT_WAIT");

    if (tries >= 5) {
      clearInterval(connectWaitInterval);
      connectWaitInterval = null;
      console.log(`[TWILIO_VOICE] [${ts()}] stopped waiting telemetry`);
    }
  }, 3000);
}

/**
 * Normalize phone number to E.164 format
 * Handles various input formats and ensures +1 country code for US numbers
 * @param {string} to - Phone number (with or without +, with or without country code)
 * @returns {string} - E.164 formatted number (e.g., +18132207636)
 */
function normalizeToE164(to) {
  if (!to) return "";
  
  // Remove all non-digit characters except leading +
  let cleaned = to.replace(/[^\d+]/g, "");
  
  // Case 1: Starts with + but missing country code (e.g., "+8132207636" = +10 digits)
  // This means user probably typed + then the number without thinking about country code
  if (cleaned.startsWith("+")) {
    const digitsOnly = cleaned.substring(1); // Remove the +
    
    // If it's 10 digits, it's US without country code
    if (digitsOnly.length === 10) {
      return "+1" + digitsOnly; // "+8132207636" -> "+18132207636"
    }
    
    // If it's 11 digits starting with 1, prepend +
    if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
      return "+" + digitsOnly; // "+18132207636" -> "+18132207636"
    }
    
    // Otherwise assume it's already correct (e.g., "+52...", "+44...")
    return cleaned;
  }
  
  // Case 2: No +, 10 digits (US without country code)
  if (cleaned.length === 10) {
    return "+1" + cleaned; // "8132207636" -> "+18132207636"
  }
  
  // Case 3: No +, 11 digits starting with 1 (US with country code but no +)
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return "+" + cleaned; // "18132207636" -> "+18132207636"
  }
  
  // Case 4: International number without + (assume user knows what they're doing)
  if (cleaned.length > 0) {
    return "+" + cleaned;
  }
  
  return "";
}

/**
 * Setup all supported Twilio Voice event listeners
 * These event names match the _eventHandlers defined in react-native-twilio-programmable-voice/index.js
 */
function setupEventListeners({ onDeviceReady, onDeviceNotReady } = {}) {
  console.log(`[TWILIO_VOICE] [${ts()}] Setting up event listeners`);
  
  // Only these events are supported by the Twilio Voice SDK
  const eventNames = [
    "deviceReady",
    "deviceNotReady",
    "deviceDidReceiveIncoming",
    "connectionDidConnect",
    "connectionIsReconnecting",
    "connectionDidReconnect",
    "connectionDidDisconnect",
    "callStateRinging",
    "callInviteCancelled",
    "callRejected",
  ];

  eventNames.forEach((eventName) => {
    try {
      const listener = TwilioVoice.addEventListener(eventName, (payload) => {
        console.log(`[TWILIO_VOICE][EVENT] [${ts()}] ${eventName}`, payload);

        if (eventName === "deviceReady") {
          deviceReadyFlag = true;
          console.log(`[TWILIO_VOICE] [${ts()}] deviceReady fired`);
          if (typeof onDeviceReady === "function") {
            onDeviceReady(payload);
          }
        }

        if (eventName === "deviceNotReady") {
          deviceReadyFlag = false;
          const deviceErr = payload?.err || payload?.error || payload;
          console.log(`[TWILIO_VOICE] [${ts()}] deviceNotReady fired:`, deviceErr);
          if (typeof onDeviceNotReady === "function") {
            onDeviceNotReady(payload);
          }
        }

        if (eventName === "connectionDidConnect" || eventName === "connectionDidDisconnect") {
          console.log(`[TWILIO_VOICE] [${ts()}] ${eventName} call details:`, {
            call_sid: payload?.call_sid,
            call_state: payload?.call_state,
            call_from: payload?.call_from,
            call_to: payload?.call_to,
          });
        }
      });
      if (listener) {
        activeListeners.push({ eventName, listener });
      }
    } catch (e) {
      console.log(`[TWILIO_VOICE] Error registering listener for ${eventName}:`, e?.message);
    }
  });
}

/**
 * Initialize Twilio Voice SDK with access token
 * @param {string} token - Twilio access token from backend
 */
export async function initTwilioVoice(token, options = {}) {
  if (!token) {
    throw new Error("Missing Twilio access token");
  }
  console.log(`[TWILIO_VOICE] [${ts()}] Initializing Twilio Voice SDK with token`);
  
  try {
    cleanupEventListeners();
    twilioInitialized = false;
    deviceReadyFlag = false;

    // Setup event listeners first
    setupEventListeners(options);
    
    // Initialize with token
    const result = await TwilioVoice.initWithToken(token);
    twilioInitialized = true;
    console.log("[TWILIO_VOICE] Initialization result:", result);
    console.log(`[TWILIO_VOICE] [${ts()}] init complete`);
    console.log("[TWILIO_VOICE] token identity:", getTokenIdentity(token));

    if (sdkMethodExists("configureCallKit")) {
      try {
        TwilioVoice.configureCallKit({ appName: "Glō" });
        console.log(`[TWILIO_VOICE] [${ts()}] configureCallKit success`);
      } catch (e) {
        console.log(`[TWILIO_VOICE] [${ts()}] configureCallKit failed:`, e?.message || e);
      }
    } else {
      console.log(`[TWILIO_VOICE] [${ts()}] configureCallKit missing on SDK`);
    }

    await logSdkState("INIT");
    
    return result;
  } catch (e) {
    twilioInitialized = false;
    deviceReadyFlag = false;
    console.log("[TWILIO_VOICE] Init error:", e?.message || e);
    throw e;
  }
}

/**
 * Start an outgoing call
 * @param {string} to - Phone number (e.g., 8132207636 or +18132207636)
 */
export async function startCall(to) {
  if (!to || !to.trim()) {
    throw new Error("Missing phone number");
  }

  if (!twilioInitialized) {
    throw new Error("Twilio Voice is not initialized yet.");
  }
  if (!deviceReadyFlag) {
    console.log(`[TWILIO_VOICE] [${ts()}] WARNING: deviceReady never fired — attempting connect anyway`);
  }
  
  // Normalize to E.164
  const toE164 = normalizeToE164(to);
  
  if (!toE164) {
    throw new Error("Could not normalize phone number to E.164 format");
  }
  
  console.log("[TWILIO_VOICE] startCall: normalized", to, "→", toE164);
  
  try {
    // Use capital To: in connect params (required by Twilio SDK spec)
    console.log(`[TWILIO_VOICE] [${ts()}] before connect()`);
    console.log("[TWILIO_VOICE] connect params:", { To: toE164 });
    const connectResult = await TwilioVoice.connect({ To: toE164 });
    console.log("[TWILIO_VOICE] connect() return value:", connectResult);
    console.log(`[TWILIO_VOICE] [${ts()}] after connect()`);
    startConnectWaitTelemetry();
  } catch (e) {
    console.log("[TWILIO_VOICE] startCall error:", e?.message || e);
    throw e;
  }
}

export function isTwilioInitialized() {
  return twilioInitialized;
}

export function isTwilioDeviceReady() {
  return deviceReadyFlag;
}

/**
 * End the active call
 */
export function endCall() {
  console.log("[TWILIO_VOICE] endCall: disconnect() invoked");
  try {
    TwilioVoice.disconnect();
  } catch (e) {
    console.log("[TWILIO_VOICE] endCall error:", e?.message || e);
    throw e;
  }
}

/**
 * Cleanup: remove all event listeners
 */
export function cleanupEventListeners() {
  console.log(`[TWILIO_VOICE] [${ts()}] Cleaning up event listeners`);
  deviceReadyFlag = false;
  if (connectWaitInterval) {
    clearInterval(connectWaitInterval);
    connectWaitInterval = null;
  }
  activeListeners.forEach(({ eventName, listener }) => {
    try {
      if (listener && typeof listener.remove === "function") {
        listener.remove();
        console.log("[TWILIO_VOICE] Removed listener for", eventName);
      }
    } catch (e) {
      console.log(`[TWILIO_VOICE] Error removing listener for ${eventName}:`, e?.message);
    }
  });
  activeListeners = [];
}
