const RECOVERY_STATES = new Set([
  "billing_inactive_recovery",
  "unsafe_phone_recovery",
  "verification_restart_required",
  "provisioning_retryable_failure",
  "provisioning_terminal_failure",
]);

const PAYMENT_STATES = new Set([
  "billing_incomplete",
  "payment_required",
  "trial_activation_required",
]);

const SETUP_STATES = new Set(["setup_mode", "setup_incomplete"]);
export const PHONE_SETUP_STRATEGIES = Object.freeze(["new_number", "forward_existing"]);

function objectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function boolean(value) {
  return value === true;
}

function safeString(value) {
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}

export function parseSetupReadinessResponse(response) {
  const body = objectOrEmpty(response?.data);
  if (typeof body.enabled !== "boolean") {
    throw new Error("SETUP_READINESS_MALFORMED");
  }
  if (!body.enabled) return Object.freeze({ enabled: false });

  const contractVersion = safeString(body.contractVersion);
  const clientSetupState = safeString(body.clientSetupState).toLowerCase();
  const productBody = objectOrEmpty(body.product);
  const productType = safeString(
    typeof body.product === "string" ? body.product : productBody.type
  ).toLowerCase();
  if (!contractVersion || !clientSetupState || productType !== "individual") {
    throw new Error("SETUP_READINESS_MALFORMED");
  }

  const billing = objectOrEmpty(body.billing);
  const business = objectOrEmpty(body.business);
  const phone = objectOrEmpty(body.phone);
  const readiness = objectOrEmpty(body.readiness);
  const actions = objectOrEmpty(body.actions);

  return Object.freeze({
    enabled: true,
    contractVersion,
    clientSetupState,
    product: Object.freeze({ type: "individual" }),
    billing: Object.freeze({
      status: safeString(billing.status).toLowerCase(),
      commerciallyActive: boolean(billing.commerciallyActive),
    }),
    business: Object.freeze({
      profileComplete: boolean(business.profileComplete),
      servicesComplete: boolean(business.servicesComplete),
      businessHoursComplete: boolean(business.businessHoursComplete),
      aiGreetingAndLanguageComplete: boolean(business.aiGreetingAndLanguageComplete),
    }),
    phone: Object.freeze({
      setupState: safeString(phone.setupState).toLowerCase(),
      recoveryState: safeString(phone.recoveryState).toLowerCase(),
      strategy: ["new_number", "forward_existing"].includes(safeString(phone.strategy).toLowerCase())
        ? safeString(phone.strategy).toLowerCase()
        : "",
    }),
    readiness: Object.freeze({
      businessProfileComplete: boolean(readiness.businessProfileComplete),
      servicesComplete: boolean(readiness.servicesComplete),
      businessHoursComplete: boolean(readiness.businessHoursComplete),
      aiGreetingAndLanguageComplete: boolean(readiness.aiGreetingAndLanguageComplete),
      phoneSetupComplete: boolean(readiness.phoneSetupComplete),
    }),
    actions: Object.freeze({
      canStartPhoneSetup: boolean(actions.canStartPhoneSetup),
      canChooseStrategy: boolean(actions.canChooseStrategy),
      canOpenBilling: boolean(actions.canOpenBilling),
      canOpenPhoneRecovery: boolean(actions.canOpenPhoneRecovery),
      canViewForwardingStatus: boolean(actions.canViewForwardingStatus),
      canContactSupport: boolean(actions.canContactSupport),
    }),
  });
}

export function parsePhoneSetupStartResponse(response) {
  const body = objectOrEmpty(response?.data);
  const phoneSetupIntentId = safeString(body.phoneSetupIntentId);
  if (!phoneSetupIntentId) throw new Error("PHONE_SETUP_START_MALFORMED");
  return Object.freeze({ phoneSetupIntentId });
}

export function createOwnedSetupReadiness(ownerIdentity, readiness) {
  const ownerId = safeString(ownerIdentity);
  if (!ownerId || !readiness) return null;
  return Object.freeze({ ownerId, value: readiness });
}

export function selectOwnedSetupReadiness(state, ownerIdentity) {
  const ownerId = safeString(ownerIdentity);
  return ownerId && state?.ownerId === ownerId ? state.value : null;
}

export function createOwnedPhoneSetupIntent(ownerIdentity, phoneSetupIntentId) {
  const ownerId = safeString(ownerIdentity);
  const value = safeString(phoneSetupIntentId);
  if (!ownerId || !value) return null;
  return Object.freeze({ ownerId, value });
}

export function selectOwnedPhoneSetupIntent(state, ownerIdentity) {
  const ownerId = safeString(ownerIdentity);
  return ownerId && state?.ownerId === ownerId ? state.value : "";
}

export async function fetchSetupReadiness(apiClient) {
  return parseSetupReadinessResponse(await apiClient.get("/phone/setup/readiness"));
}

export async function requestPhoneSetupStart(apiClient) {
  return parsePhoneSetupStartResponse(
    await apiClient.post("/phone/setup/start", { productType: "individual" })
  );
}

export function createSingleFlight() {
  let active = null;
  return (operation) => {
    if (active) return active;
    active = Promise.resolve().then(operation);
    return active.finally(() => {
      active = null;
    });
  };
}

export function createSetupModeCoordinator({ apiClient, clientEnabled = true, onChange = () => {} }) {
  let authenticated = false;
  let ownerId = "";
  let generation = 0;
  let readinessState = null;
  let phoneSetupIntentState = null;
  let loading = false;
  let startFlight = null;

  const notify = () => onChange();
  const snapshot = () => Object.freeze({ readinessState, phoneSetupIntentState, loading });

  async function refreshReadiness() {
    const requestOwner = ownerId;
    const requestGeneration = generation;
    if (!clientEnabled || !authenticated || !requestOwner) return null;
    loading = true;
    notify();
    try {
      const parsed = await fetchSetupReadiness(apiClient);
      if (generation !== requestGeneration || ownerId !== requestOwner) return null;
      readinessState = createOwnedSetupReadiness(requestOwner, parsed);
      return parsed;
    } catch (error) {
      if (generation !== requestGeneration || ownerId !== requestOwner) return null;
      const fallback = error?.response?.status === 404
        ? Object.freeze({ enabled: false })
        : Object.freeze({ enabled: true, invalid: true, clientSetupState: "recovery_required" });
      readinessState = createOwnedSetupReadiness(requestOwner, fallback);
      return fallback;
    } finally {
      if (generation === requestGeneration && ownerId === requestOwner) {
        loading = false;
        notify();
      }
    }
  }

  function activateSession(nextAuthenticated, nextOwnerIdentity) {
    generation += 1;
    authenticated = nextAuthenticated === true;
    ownerId = safeString(nextOwnerIdentity);
    readinessState = null;
    phoneSetupIntentState = null;
    loading = Boolean(clientEnabled && authenticated && ownerId);
    startFlight = null;
    notify();
    return loading ? refreshReadiness() : Promise.resolve(null);
  }

  function startPhoneSetup() {
    const readiness = selectOwnedSetupReadiness(readinessState, ownerId);
    if (
      !readiness?.actions?.canStartPhoneSetup ||
      readiness?.billing?.commerciallyActive !== true
    ) {
      return Promise.reject(new Error("PHONE_SETUP_NOT_READY"));
    }
    if (startFlight) return startFlight;
    const requestOwner = ownerId;
    const requestGeneration = generation;
    const flight = requestPhoneSetupStart(apiClient).then((result) => {
      if (generation !== requestGeneration || ownerId !== requestOwner) {
        throw new Error("PHONE_SETUP_OWNER_CHANGED");
      }
      phoneSetupIntentState = createOwnedPhoneSetupIntent(
        requestOwner,
        result.phoneSetupIntentId
      );
      notify();
      return result;
    });
    startFlight = flight.finally(() => {
      if (startFlight === wrappedFlight) startFlight = null;
    });
    const wrappedFlight = startFlight;
    return wrappedFlight;
  }

  const invalidateSession = () => activateSession(false, null);

  return Object.freeze({
    activateSession,
    invalidateSession,
    refreshReadiness,
    startPhoneSetup,
    snapshot,
  });
}

export function createSetupModeSignOutController({ invalidateSetupSession, logout }) {
  const signOutSingleFlight = createSingleFlight();
  return Object.freeze({
    signOut: () => signOutSingleFlight(async () => {
      await invalidateSetupSession();
      return logout();
    }),
  });
}

export function selectAuthenticationDestination(authenticated) {
  return authenticated === true ? "authenticated" : "unauthenticated";
}

export function getAuthorizedSetupActions(readiness) {
  const actions = readiness?.actions || {};
  return Object.freeze({
    canStartPhoneSetup:
      actions.canStartPhoneSetup === true && readiness?.billing?.commerciallyActive === true,
    canChooseStrategy: actions.canChooseStrategy === true,
    canOpenBilling: actions.canOpenBilling === true,
    canViewForwardingStatus: actions.canViewForwardingStatus === true,
    canContactSupport: actions.canContactSupport === true,
  });
}

export function createAuthorizedSetupActionController({ readiness, navigate, openSupport }) {
  const authorized = getAuthorizedSetupActions(readiness);
  return Object.freeze({
    authorized,
    openBilling: () => {
      if (!authorized.canOpenBilling) return false;
      navigate("SetupPayment");
      return true;
    },
    openForwardingStatus: (route = "PhoneSetupRecovery") => {
      if (!authorized.canViewForwardingStatus) return false;
      navigate(route);
      return true;
    },
    contactSupport: () => {
      if (!authorized.canContactSupport) return false;
      openSupport();
      return true;
    },
  });
}

export function createSetupModeActionController({ startPhoneSetup, navigate }) {
  const startSingleFlight = createSingleFlight();
  return Object.freeze({
    start: () => startSingleFlight(async () => {
      const result = await startPhoneSetup();
      navigate("PhoneSetupChoice");
      return result;
    }),
  });
}

export async function completeTrialSetupTransition({ setupMode, navigation, navigateFromBackend }) {
  if (!setupMode?.readiness?.enabled) return navigateFromBackend(navigation);
  const refreshed = await setupMode.refreshReadiness();
  if (refreshed?.enabled) return navigation.replace("SetupModeHome");
  return navigateFromBackend(navigation);
}

export function returnFromSetupServiceSave(route, navigation) {
  if (route?.params?.setupMode === true) {
    navigation.goBack();
    return true;
  }
  return false;
}

export async function submitPhoneStrategyChoice(apiClient, payload) {
  if (!payload) throw new Error("PHONE_STRATEGY_INVALID");
  return apiClient.post("/phone/number-strategy", payload);
}

export function selectSetupModeRoute({ clientEnabled, readiness, onboardingComplete }) {
  if (!clientEnabled || readiness?.enabled === false || !readiness) {
    return onboardingComplete ? "legacy_dashboard" : "legacy_onboarding";
  }
  const state = safeString(readiness.clientSetupState).toLowerCase();
  const phoneRecoveryState = safeString(readiness.phone?.recoveryState).toLowerCase();
  if (readiness.invalid || RECOVERY_STATES.has(state) || RECOVERY_STATES.has(phoneRecoveryState)) {
    return "setup_recovery";
  }
  if (PAYMENT_STATES.has(state) || readiness.billing?.commerciallyActive !== true) {
    return "setup_payment";
  }
  if (state === "live") return "setup_dashboard";
  if (SETUP_STATES.has(state)) return "setup_mode";
  return "setup_recovery";
}

export function getSetupChecklist(readiness) {
  const source = readiness?.readiness || {};
  return Object.freeze([
    Object.freeze({ key: "business_profile", label: "Business profile", complete: source.businessProfileComplete === true }),
    Object.freeze({ key: "services", label: "Services", complete: source.servicesComplete === true }),
    Object.freeze({ key: "business_hours", label: "Business hours", complete: source.businessHoursComplete === true }),
    Object.freeze({ key: "ai_greeting_language", label: "AI greeting and language", complete: source.aiGreetingAndLanguageComplete === true }),
    Object.freeze({ key: "phone_setup", label: "Phone setup", complete: source.phoneSetupComplete === true }),
  ]);
}

export function buildPhoneStrategyRequest(strategy, phoneSetupIntentId, forwardFromNumber, forwardingCarrier) {
  if (!PHONE_SETUP_STRATEGIES.includes(strategy)) return null;
  const intent = safeString(phoneSetupIntentId);
  if (!intent) return null;
  const payload = { strategy, phoneSetupIntentId: intent };
  if (strategy === "forward_existing") {
    if (!/^\+[1-9]\d{7,14}$/.test(String(forwardFromNumber || ""))) return null;
    payload.forwardFromNumber = String(forwardFromNumber);
    if (safeString(forwardingCarrier)) payload.forwardingCarrier = safeString(forwardingCarrier);
  }
  return Object.freeze(payload);
}

export { RECOVERY_STATES };
