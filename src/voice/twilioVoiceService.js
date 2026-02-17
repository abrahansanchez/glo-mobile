import TwilioVoice from "react-native-twilio-programmable-voice";

// Store listeners globally so we can clean them up later
let activeListeners = [];

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
function setupEventListeners() {
  console.log("[TWILIO_VOICE] Setting up event listeners");
  
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
        console.log("[TWILIO_VOICE][EVENT]", eventName, payload);
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
export async function initTwilioVoice(token) {
  if (!token) {
    throw new Error("Missing Twilio access token");
  }
  console.log("[TWILIO_VOICE] Initializing Twilio Voice SDK with token");
  
  try {
    // Setup event listeners first
    setupEventListeners();
    
    // Initialize with token
    const result = await TwilioVoice.initWithToken(token);
    console.log("[TWILIO_VOICE] Initialization result:", result);
    
    return result;
  } catch (e) {
    console.log("[TWILIO_VOICE] Init error:", e?.message || e);
    throw e;
  }
}

/**
 * Start an outgoing call
 * @param {string} to - Phone number (e.g., 8132207636 or +18132207636)
 */
export function startCall(to) {
  if (!to || !to.trim()) {
    throw new Error("Missing phone number");
  }
  
  // Normalize to E.164
  const toE164 = normalizeToE164(to);
  
  if (!toE164) {
    throw new Error("Could not normalize phone number to E.164 format");
  }
  
  console.log("[TWILIO_VOICE] startCall: normalized", to, "→", toE164);
  
  try {
    // Use capital To: in connect params (required by Twilio SDK spec)
    TwilioVoice.connect({ To: toE164 });
    console.log("[TWILIO_VOICE] connect() invoked");
  } catch (e) {
    console.log("[TWILIO_VOICE] startCall error:", e?.message || e);
    throw e;
  }
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
  console.log("[TWILIO_VOICE] Cleaning up event listeners");
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

