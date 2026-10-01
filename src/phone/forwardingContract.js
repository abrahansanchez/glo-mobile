const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export const FORWARDING_SETUP_STATES = new Set([
  "provisioning",
  "provisioning_failed_retryable",
  "provisioning_failed_terminal",
  "awaiting_forwarding_setup",
  "verification_in_progress",
  "verification_failed_retryable",
  "verified",
]);

const SERVER_ONLY_ONBOARDING_FIELDS = new Set([
  "forwardToNumber",
  "verificationCode",
  "verificationSessionId",
  "verificationWindowExpiresAt",
  "provisioningStatus",
  "provisioningFailureClass",
  "provisioningRetryAfter",
  "phoneSetupState",
  "forwardingVerifiedAt",
]);

export function normalizeE164(value) {
  const raw = String(value || "").trim();
  if (E164_REGEX.test(raw)) return raw;
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return "";
}

export function parseForwardingResponse(response) {
  const payload = response?.data && typeof response.data === "object"
    ? response.data
    : response || {};
  const phoneSetupState = String(payload.phoneSetupState || "").toLowerCase();

  return {
    forwardFromNumber: normalizeE164(payload.forwardFromNumber),
    forwardToNumber: normalizeE164(payload.forwardToNumber),
    forwardingCarrier:
      typeof payload.forwardingCarrier === "string" ? payload.forwardingCarrier : "",
    forwardingStatus:
      typeof payload.forwardingStatus === "string" ? payload.forwardingStatus.toLowerCase() : "",
    forwardingVerifiedAt: payload.forwardingVerifiedAt || null,
    verificationSessionId:
      typeof payload.verificationSessionId === "string" ? payload.verificationSessionId : "",
    verificationWindowExpiresAt: payload.verificationWindowExpiresAt || null,
    provisioningStatus:
      typeof payload.provisioningStatus === "string" ? payload.provisioningStatus.toLowerCase() : "",
    provisioningFailureClass:
      typeof payload.provisioningFailureClass === "string"
        ? payload.provisioningFailureClass.toLowerCase()
        : "",
    provisioningRetryAfter: payload.provisioningRetryAfter || null,
    phoneSetupState: FORWARDING_SETUP_STATES.has(phoneSetupState) ? phoneSetupState : "",
    verified: payload.verified === true,
  };
}

export function sanitizeGenericOnboardingData(data) {
  return Object.fromEntries(
    Object.entries(data || {}).filter(([key]) => !SERVER_ONLY_ONBOARDING_FIELDS.has(key))
  );
}

export function createAuthenticatedForwardingState(ownerIdentity, response) {
  const ownerKey = String(ownerIdentity || "").trim();
  if (!ownerKey) return null;
  return {
    ownerKey,
    status: parseForwardingResponse(response),
  };
}

export function selectAuthenticatedForwardingStatus(state, ownerIdentity) {
  const ownerKey = String(ownerIdentity || "").trim();
  if (!ownerKey || state?.ownerKey !== ownerKey) return null;
  return state.status || null;
}

export function clearAuthenticatedForwardingState() {
  return null;
}

export function getForwardingSetupControls(status) {
  const state = String(status?.phoneSetupState || "");
  const destinationReady = hasAssignedForwardingDestination(status);
  const provisioningPending = state === "provisioning";
  const provisioningRetryable = state === "provisioning_failed_retryable";
  const provisioningTerminal = state === "provisioning_failed_terminal";
  return {
    destinationReady,
    provisioningPending,
    provisioningRetryable,
    provisioningTerminal,
    canCheckStatus: provisioningPending,
    canRetryProvisioning: provisioningRetryable,
    canActivate:
      destinationReady &&
      !provisioningPending &&
      !provisioningRetryable &&
      !provisioningTerminal,
  };
}

export function beginExclusiveOperation(lock, operation) {
  if (!lock || lock.current) return false;
  lock.current = operation;
  return true;
}

export function endExclusiveOperation(lock, operation) {
  if (lock?.current === operation) lock.current = "";
}

export function buildNumberStrategyPayload({
  strategy,
  forwardFromNumber,
  forwardingCarrier,
}) {
  const payload = { strategy };
  if (strategy !== "forward_existing") return payload;
  const normalizedFrom = normalizeE164(forwardFromNumber);
  if (!normalizedFrom) return null;
  return {
    ...payload,
    forwardFromNumber: normalizedFrom,
    ...(forwardingCarrier ? { forwardingCarrier } : {}),
  };
}

export function hasAssignedForwardingDestination(state) {
  return Boolean(normalizeE164(state?.forwardToNumber));
}

export function buildCarrierActivationCode(carrier, forwardToNumber) {
  const normalized = normalizeE164(forwardToNumber);
  if (!normalized) return "";
  const digits = normalized.slice(1);
  if (carrier === "Verizon") return `*72${digits}`;
  if (carrier === "AT&T") return `*21*${digits}#`;
  if (carrier === "T-Mobile") return `**21*${digits}#`;
  return "";
}

export function buildVerificationStartBody({ forwardFromNumber, forwardToNumber }) {
  const normalizedFrom = normalizeE164(forwardFromNumber);
  const normalizedTo = normalizeE164(forwardToNumber);
  if (!normalizedFrom || !normalizedTo) return null;
  return {
    forwardFromNumber: normalizedFrom,
    forwardToNumber: normalizedTo,
  };
}
