import TwilioVoice from "react-native-twilio-programmable-voice";
import { AppState, Platform } from "react-native";
import { fetchVoiceToken } from "./voiceTokenService";
import { getBarber } from "../auth/barberStorage";

let listenersAttached = false;
let deviceReadySeen = false;
let appStateListenerAttached = false;
let currentAppState = AppState.currentState || "active";
let deviceReadyWatchdog = null;
let sessionGeneration = 0;
let attemptSequence = 0;
let initInFlight = null;
let activeAttempt = null;
let registrationRecoveryBlocked = false;
let blockedAttempt = null;
let ownershipBlockDiagnosticTimer = null;
const queuedInvites = [];
const incomingInviteSubscribers = new Set();
const inviteCancelledSubscribers = new Set();

function resolveCallSid(payload) {
  return payload?.call_sid || payload?.callSid || payload?.CallSid || null;
}

function correlationId(value) {
  if (value == null || value === "") return null;
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `ref_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function errorDiagnostic(error) {
  return {
    hasError: !!error,
    status: error?.response?.status || null,
    code: error?.code || null,
    name: error?.name || null,
  };
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
    callRef: correlationId(callSid),
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

function attemptLog(attempt, stage, outcome, extra = {}) {
  console.log("[VOIP_ATTEMPT]", {
    attemptId: attempt?.id || null,
    generation: attempt?.generation ?? null,
    trigger: attempt?.trigger || null,
    hasIdentity: attempt?.identity != null,
    stage,
    outcome,
    ...extra,
  });
}

function isCurrentAttempt(attempt) {
  return !!attempt && activeAttempt === attempt && attempt.generation === sessionGeneration;
}

function identitiesMatch(left, right) {
  return left != null && right != null && String(left) === String(right);
}

function blockNativeRecovery(attempt, reason) {
  registrationRecoveryBlocked = true;
  blockedAttempt = attempt || blockedAttempt;
  attemptLog(attempt, "native_ownership", "recovery_required", { reason });
  if (!ownershipBlockDiagnosticTimer) {
    ownershipBlockDiagnosticTimer = setTimeout(() => {
      ownershipBlockDiagnosticTimer = null;
      attemptLog(blockedAttempt, "native_ownership", "still_blocked_after_timeout", { reason });
    }, 10000);
  }
}

function scheduleDeviceReadyWatchdog(accessToken, attempt, timeoutMs = 10000) {
  if (deviceReadyWatchdog) {
    clearTimeout(deviceReadyWatchdog);
  }
  deviceReadyWatchdog = setTimeout(async () => {
    if (isCurrentAttempt(attempt) && !deviceReadySeen) {
      console.log("[VOIP] ⚠️ deviceReady did not fire within expected window");
      logVoipDiag();

      if (!attempt.retryAttempted) {
        attempt.retryAttempted = true;
        attempt.nativeOperationCount += 1;
        console.log("[VOIP] retrying initWithToken once due to missing deviceReady");
        try {
          const retryResult = await TwilioVoice.initWithToken(accessToken);
          if (!isCurrentAttempt(attempt)) {
            blockNativeRecovery(attempt, "retry_completed_after_invalidation");
            return;
          }
          console.log("[VOIP] retry initWithToken resolved", {
            initialized: retryResult?.initialized === true,
          });
          attemptLog(attempt, "sdk_retry", "started", { initialized: retryResult?.initialized === true });
        } catch (error) {
          console.log("[VOIP] ❌ retry initWithToken failed", errorDiagnostic(error));
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
      console.log("[VOIP] incoming subscriber error", errorDiagnostic(error));
    }
  });
}

function emitInviteCancelled(payload) {
  inviteCancelledSubscribers.forEach((subscriber) => {
    try {
      subscriber(payload);
    } catch (error) {
      console.log("[VOIP] cancelled subscriber error", errorDiagnostic(error));
    }
  });
}

function attachTwilioVoipListenersOnce() {
  if (listenersAttached) {
    return;
  }
  listenersAttached = true;

  TwilioVoice.addEventListener("deviceReady", () => {
    if (registrationRecoveryBlocked) {
      attemptLog(blockedAttempt, "stale_native_event", "deviceReady_ignored");
      return;
    }
    if (!isCurrentAttempt(activeAttempt)) {
      console.log("[VOIP] stale deviceReady ignored");
      return;
    }
    console.log("[VOICE] deviceReady fired");
    console.log("[VOICE] REGISTER SUCCESS");
    console.log("[VOICE] device REGISTERED with Twilio");
    console.log("[VOIP] deviceReady fired");
    console.log("[VOIP] ✅ deviceReady (VoIP push registered)");
    attemptLog(activeAttempt, "native_registration", "success");
    activeAttempt.registrationState = "ready";
    if (deviceReadyWatchdog) {
      clearTimeout(deviceReadyWatchdog);
      deviceReadyWatchdog = null;
    }
    markDeviceReadyAndFlush("deviceReady_event");
  });

  TwilioVoice.addEventListener("deviceNotReady", (payload) => {
    if (registrationRecoveryBlocked) {
      attemptLog(blockedAttempt, "stale_native_event", "deviceNotReady_ignored", {
        hasError: !!(payload?.err || payload?.error),
      });
      return;
    }
    if (!isCurrentAttempt(activeAttempt)) {
      console.log("[VOIP] stale deviceNotReady ignored", { hasPayload: !!payload });
      return;
    }
    deviceReadySeen = false;
    console.log("[VOICE] deviceNotReady", { hasError: !!(payload?.err || payload?.error) });
    console.log("[VOICE] REGISTER FAILED");
    console.log("[VOICE] device NOT REGISTERED");
    console.log("[VOIP] ❌ deviceNotReady");
    attemptLog(activeAttempt, "native_registration", "failure", {
      hasError: !!(payload?.err || payload?.error),
    });
    const hasUnresolvedRetryOwnership =
      activeAttempt.retryAttempted || activeAttempt.nativeOperationCount > 1;
    if (hasUnresolvedRetryOwnership) {
      activeAttempt.registrationState = "ownership_ambiguous";
      if (deviceReadyWatchdog) {
        clearTimeout(deviceReadyWatchdog);
        deviceReadyWatchdog = null;
      }
      blockNativeRecovery(activeAttempt, "deviceNotReady_with_multiple_native_operations");
      logVoipDiag();
      return;
    }
    activeAttempt.registrationState = "failed";
    activeAttempt.nativeStarted = false;
    activeAttempt = null;
    if (deviceReadyWatchdog) {
      clearTimeout(deviceReadyWatchdog);
      deviceReadyWatchdog = null;
    }
    logVoipDiag();
  });

  TwilioVoice.addEventListener("deviceDidReceiveIncoming", (payload) => {
    const callSid = resolveCallSid(payload);
    const isForeground = isForegroundAppState(currentAppState);
    const contextLabel = isForeground ? "foreground" : "background_or_locked";
    console.log("[VOIP] incoming call received", { callRef: correlationId(callSid) });
    console.log("[VOIP] 📞 incoming call invite", { callRef: correlationId(callSid) });
    console.log("[VOIP] incoming invite context", contextLabel);
    console.log("[VOIP] invite call_sid mapping", {
      hasSnakeCase: !!payload?.call_sid,
      hasCamelCase: !!payload?.callSid,
      hasPascalCase: !!payload?.CallSid,
      callRef: correlationId(callSid),
    });
    logVoipDiag({ payload, hasInvite: true });

    if (!deviceReadySeen) {
      queuedInvites.push(payload);
      console.log("[VOIP] incoming invite queued until deviceReady", {
        queuedCount: queuedInvites.length,
        callRef: correlationId(callSid),
      });
      return;
    }

    emitIncomingInvite(payload);
  });

  TwilioVoice.addEventListener("connectionDidConnect", (payload) => {
    console.log("[VOIP] call connected", { callRef: correlationId(resolveCallSid(payload)) });
  });

  TwilioVoice.addEventListener("connectionDidDisconnect", (payload) => {
    console.log("[VOIP] call disconnected", { callRef: correlationId(resolveCallSid(payload)) });
  });

  TwilioVoice.addEventListener("callInviteCancelled", (payload) => {
    console.log("[VOIP] ❌ callInviteCancelled", {
      callRef: correlationId(resolveCallSid(payload)),
    });
    logVoipDiag({ payload, hasInvite: false });
    emitInviteCancelled(payload);
  });
}

export function invalidateVoipRegistrationSession(reason = "unspecified") {
  const obsoleteAttempt = activeAttempt;
  const wasDeviceReady = deviceReadySeen;
  const shouldUnregister = wasDeviceReady || obsoleteAttempt?.nativeStarted;
  const hasAmbiguousNativeOwnership =
    obsoleteAttempt?.nativeStarted && (!wasDeviceReady || obsoleteAttempt.retryAttempted);
  sessionGeneration += 1;
  activeAttempt = null;
  initInFlight = null;
  deviceReadySeen = false;
  queuedInvites.splice(0, queuedInvites.length);
  if (deviceReadyWatchdog) {
    clearTimeout(deviceReadyWatchdog);
    deviceReadyWatchdog = null;
  }

  if (hasAmbiguousNativeOwnership) {
    blockNativeRecovery(obsoleteAttempt, "obsolete_native_registration_unresolved");
  }

  attemptLog(obsoleteAttempt, "session", "invalidated", { reason });
  if (shouldUnregister) {
    try {
      TwilioVoice.unregister?.();
    } catch (error) {
      console.log("[VOIP] unregister failed during invalidation", errorDiagnostic(error));
    }
  }
}

export async function initVoipPushAndRegisterOnce(trigger = "unspecified", expectedIdentity = null) {
  try {
    attachAppStateDiagnosticsOnce();
    console.log("[VOIP] attachAppStateDiagnosticsOnce done");
  } catch (err) {
    console.log("[VOIP] ❌ attachAppStateDiagnosticsOnce threw", errorDiagnostic(err));
  }
  try {
    attachTwilioVoipListenersOnce();
    console.log("[VOIP] attachTwilioVoipListenersOnce done");
  } catch (err) {
    console.log("[VOIP] ❌ attachTwilioVoipListenersOnce threw", errorDiagnostic(err));
  }

  if (registrationRecoveryBlocked) {
    attemptLog(blockedAttempt, "native_ownership", "request_blocked", { requestedTrigger: trigger });
    return { blocked: true, recoveryRequired: true, reason: "native_ownership_ambiguous" };
  }

  if (activeAttempt) {
    if (!identitiesMatch(activeAttempt.identity, expectedIdentity)) {
      attemptLog(activeAttempt, "identity", "explicit_invalidation_required", {
        hasRequestedIdentity: expectedIdentity != null,
        requestedTrigger: trigger,
      });
      return { blocked: true, invalidationRequired: true, reason: "different_identity_active" };
    }
    attemptLog(activeAttempt, "dedupe", "reused", { requestedTrigger: trigger });
    if (initInFlight) return initInFlight;
    return {
      reused: true,
      attemptId: activeAttempt.id,
      registrationState: activeAttempt.registrationState,
      ready: deviceReadySeen,
    };
  }

  const attempt = {
    id: ++attemptSequence,
    generation: sessionGeneration,
    trigger,
    identity: expectedIdentity || null,
    nativeStarted: false,
    nativeOperationCount: 0,
    retryAttempted: false,
    registrationState: "preparing",
  };
  activeAttempt = attempt;
  attemptLog(attempt, "initialization", "started");

  const promise = (async () => {
    if (!isCurrentAttempt(attempt)) {
      attemptLog(attempt, "preparation", "obsolete");
      return { obsolete: true };
    }

    console.log("[VOICE] fetching token");
    console.log("[VOIP] fetching voice jwt for Twilio init");
    console.log("[VOIP] about to call fetchVoiceToken inside initVoipPushAndRegisterOnce");
    let accessToken, tokenIdentity;
    try {
      const result = await fetchVoiceToken();
      accessToken = result.token;
      tokenIdentity = result.identity;
    } catch (err) {
      console.log("[VOIP] ❌ fetchVoiceToken failed inside init", errorDiagnostic(err));
      throw err;
    }
    attempt.identity = tokenIdentity || expectedIdentity || null;
    attemptLog(attempt, "voice_token", "success");
    if (!isCurrentAttempt(attempt)) {
      attemptLog(attempt, "voice_token", "obsolete");
      return { obsolete: true };
    }
    const barber = await getBarber();
    if (!isCurrentAttempt(attempt)) {
      attemptLog(attempt, "barber_lookup", "obsolete");
      return { obsolete: true };
    }
    const barberId = barber?._id || barber?.id || null;
    console.log("[VOIP] fetched voice jwt");
    console.log("[VOIP_IDENTITY_CHECK]", {
      hasBarberId: barberId != null,
      hasTokenIdentity: tokenIdentity != null,
      matches: barberId && tokenIdentity ? identitiesMatch(barberId, tokenIdentity) : null,
    });
    if (expectedIdentity && tokenIdentity && String(expectedIdentity) !== String(tokenIdentity)) {
      throw new Error("Voice token identity does not match the authenticated account");
    }

    if (Platform.OS === "ios") {
      console.log("[VOIP] configuring CallKit defaults");
      TwilioVoice.configureCallKit({
        appName: "Glō",
        includesCallsInRecents: false,
      });
      console.log("[CALLKIT_HANDLERS]", Object.keys(TwilioVoice));
      console.log("[VOIP] CallKit configured");
    }

    console.log("[VOIP] initializing Twilio Voice with access token");
    console.log("[VOICE] registering device");
    console.log("[VOICE_INIT] starting initWithToken");
    console.log("[VOIP] initWithToken starting");
    if (!isCurrentAttempt(attempt)) {
      attemptLog(attempt, "native_initialization", "obsolete_before_start");
      return { obsolete: true };
    }
    try {
      attempt.nativeStarted = true;
      attempt.nativeOperationCount += 1;
      attempt.registrationState = "registering";
      const result = await TwilioVoice.initWithToken(accessToken);
      console.log("[VOICE_INIT] initWithToken completed");
      console.log("[VOICE] SDK initialized");
      console.log("[VOIP] initWithToken resolved", {
        initialized: result?.initialized === true,
      });
      attemptLog(attempt, "sdk_initialization", "started", { initialized: result?.initialized === true });
    } catch (error) {
      attempt.nativeStarted = false;
      console.log("[VOIP] ❌ initWithToken threw", errorDiagnostic(error));
      throw error;
    }

    if (!isCurrentAttempt(attempt)) {
      attemptLog(attempt, "sdk_initialization", "obsolete");
      return { obsolete: true };
    }
    scheduleDeviceReadyWatchdog(accessToken, attempt, 10000);
    return { started: true, attemptId: attempt.id };
  })().catch((error) => {
    console.log("[VOIP] ❌ VoIP init failed", errorDiagnostic(error));
    attemptLog(attempt, "initialization", "failure", errorDiagnostic(error));
    throw error;
  }).finally(() => {
    if (initInFlight === promise) {
      initInFlight = null;
    }
    if (activeAttempt === attempt && !attempt.nativeStarted) {
      activeAttempt = null;
    }
  });

  initInFlight = promise;
  return promise;
}

export function isVoipPushInitialized() {
  return !!activeAttempt?.nativeStarted;
}

export function isVoipDeviceReady() {
  return deviceReadySeen;
}

export function getVoipRegistrationRecoveryState() {
  return {
    blocked: registrationRecoveryBlocked,
    reason: registrationRecoveryBlocked ? "native_ownership_ambiguous" : null,
    blockedAttemptId: blockedAttempt?.id || null,
    hasBlockedIdentity: blockedAttempt?.identity != null,
  };
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
    console.log("[VOIP] reject failed, trying ignore", errorDiagnostic(rejectError));
    return Promise.resolve(TwilioVoice.ignore());
  }
}
