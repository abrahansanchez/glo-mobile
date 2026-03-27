import React, { createContext, useEffect, useMemo, useState, useContext, useCallback, useRef } from "react";
import {
  isComplete,
  getStoredStep,
  getOnboardingData,
  markComplete as persistComplete,
  setStoredStep as persistStep,
  setOnboardingData as persistData,
  resetOnboarding as persistReset,
} from "./onboardingStorage";
import { AuthContext } from "../auth/authContext";
import api from "../config/api";
import { STEP_VALUES, STEPS } from "./stepKeys";
import { track } from "../analytics/track";
import { ONBOARDING_SCREEN_MAP } from "../navigation/onboardingScreenMap";

export const OnboardingContext = createContext(null);

function normalizeLanguage(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized.startsWith("es")) return "es";
  return normalized === "en" ? "en" : "";
}

function normalizeStep(step) {
  if (!step || typeof step !== "string") return STEPS.WELCOME;
  const value = step.toLowerCase();
  const legacyMap = {
    language: STEPS.LANGUAGE,
    welcome: STEPS.WELCOME,
    account: STEPS.ACCOUNT,
    phone: STEPS.ACCOUNT,
    business_setup: STEPS.BUSINESS_SNAPSHOT,
    business_snapshot: STEPS.BUSINESS_SNAPSHOT,
    phone_choice: STEPS.NUMBER_STRATEGY,
    number_strategy: STEPS.NUMBER_STRATEGY,
    forwarding_flow: STEPS.FORWARDING_SETUP,
    forwarding_setup: STEPS.FORWARDING_SETUP,
    forwarding_verification: STEPS.FORWARDING_VERIFICATION,
    trial_start: STEPS.TRIAL_START,
  };
  return legacyMap[value] || value;
}

function getStringValue(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizeForwardingStatus(raw) {
  return getStringValue(
    raw?.forwardingStatus,
    raw?.forwarding?.status,
    raw?.phoneSetup?.forwardingStatus,
    raw?.phoneSetupState?.forwardingStatus,
    raw?.phone?.forwardingStatus,
    raw?.stepMap?.forwarding?.status
  ).toLowerCase();
}

function normalizeNumberStrategy(raw) {
  return getStringValue(
    raw?.numberStrategy,
    raw?.phoneStrategy,
    raw?.phone?.strategy,
    raw?.phoneSetup?.strategy,
    raw?.phoneSetupState?.strategy,
    raw?.stepMap?.number_strategy?.strategy
  ).toLowerCase();
}

function resolveForwardingResumeStep(raw, fallbackStep, complete) {
  if (complete) return fallbackStep;
  const strategy = normalizeNumberStrategy(raw);
  if (strategy !== "forward_existing") return fallbackStep;

  const explicitStep = normalizeStep(
    getStringValue(
      raw?.forwardingNextStep,
      raw?.phoneSetup?.nextStep,
      raw?.phoneSetupState?.nextStep
    )
  );
  if (
    explicitStep === STEPS.FORWARDING_SETUP ||
    explicitStep === STEPS.FORWARDING_VERIFICATION
  ) {
    return explicitStep;
  }

  if (fallbackStep === STEPS.FORWARDING_FLOW) {
    return STEPS.FORWARDING_SETUP;
  }

  const forwardingStatus = normalizeForwardingStatus(raw);
  if (["verified", "complete", "completed"].includes(forwardingStatus)) {
    return fallbackStep;
  }

  if (
    [
      "pending_verification",
      "verification_started",
      "testing",
      "verifying",
      "active",
      "activated",
      "failed",
    ].includes(forwardingStatus)
  ) {
    return STEPS.FORWARDING_VERIFICATION;
  }

  if (fallbackStep === STEPS.TRIAL_START || fallbackStep === "go_live_checklist") {
    return STEPS.FORWARDING_SETUP;
  }

  if (fallbackStep === STEPS.NUMBER_STRATEGY) {
    return STEPS.FORWARDING_SETUP;
  }

  return fallbackStep;
}

function parseOnboardingStatus(payload) {
  const raw = payload || {};
  const complete = Boolean(raw?.isComplete);
  const fallbackStep = normalizeStep(raw?.nextStep || raw?.currentStep || STEPS.WELCOME);
  const step = resolveForwardingResumeStep(raw, fallbackStep, complete);
  const stepMap = raw?.stepMap || {};
  return { step, complete, stepMap };
}

function resolvePreferredLanguage(raw, barber, cachedData) {
  return normalizeLanguage(
    getStringValue(
      raw?.preferredLanguage,
      raw?.languagePreference,
      raw?.language,
      barber?.preferredLanguage,
      barber?.languagePreference,
      barber?.language,
      cachedData?.preferredLanguage
    )
  );
}

function resolvePhoneNumber(raw, barber, cachedData) {
  return getStringValue(
    raw?.phoneNumber,
    raw?.phone?.number,
    raw?.phone,
    barber?.phoneNumber,
    cachedData?.phoneNumber
  );
}

function resolveInitialStep(step, data, complete) {
  return step;
}

export function OnboardingProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setComplete] = useState(false);
  const [onboardingStep, setStep] = useState(STEPS.WELCOME);
  const [onboardingStepMap, setOnboardingStepMap] = useState({});
  const [onboardingData, setData] = useState({});
  const { barber, refreshSession } = useContext(AuthContext);
  const barberId = barber?.id || barber?._id || null;
  const onboardingStepRef = useRef(STEPS.WELCOME);
  const onboardingDataRef = useRef({});
  const lastViewedStepRef = useRef(null);

  const hydrateFromBackendStatus = useCallback(async (payload) => {
    const cachedData = barberId ? await getOnboardingData(barberId) : {};
    const parsed = parseOnboardingStatus(payload);
    const preferredLanguage = resolvePreferredLanguage(payload, barber, cachedData);
    const phoneNumber = resolvePhoneNumber(payload, barber, cachedData);
    const hydratedData = {
      ...(cachedData || {}),
      ...(preferredLanguage ? { preferredLanguage } : {}),
      ...(phoneNumber ? { phoneNumber } : {}),
      ...(typeof payload?.setupCompletedViaCall === "boolean"
        ? { setupCompletedViaCall: payload.setupCompletedViaCall }
        : {}),
    };
    const nextStep = resolveInitialStep(parsed.step, hydratedData, parsed.complete);

    setComplete(parsed.complete);
    setStep(nextStep);
    setOnboardingStepMap(parsed.stepMap);
    setData(hydratedData);

    if (barberId) {
      await persistComplete(barberId, parsed.complete);
      await persistStep(barberId, nextStep);
      await persistData(barberId, hydratedData);
    }

    return {
      ...parsed,
      step: nextStep,
      raw: payload || {},
      data: hydratedData,
    };
  }, [barber, barberId]);

  const refreshFromBackend = useCallback(async () => {
    if (!barberId) {
      return {
        step: STEPS.LANGUAGE,
        complete: false,
        stepMap: {},
        raw: { nextStep: STEPS.LANGUAGE },
        data: {},
      };
    }

    const response = await api.get("/onboarding/status");
    const result = await hydrateFromBackendStatus(response.data);
    console.log("[ONBOARDING] loaded from backend status", {
      step: result.step,
      complete: result.complete,
    });
    return result;
  }, [barberId, hydrateFromBackendStatus]);

  useEffect(() => {
    onboardingStepRef.current = onboardingStep;
  }, [onboardingStep]);

  useEffect(() => {
    onboardingDataRef.current = onboardingData || {};
  }, [onboardingData]);

  useEffect(() => {
    if (loading || onboardingComplete) return;
    if (!onboardingStep) return;
    if (lastViewedStepRef.current === onboardingStep) return;

    lastViewedStepRef.current = onboardingStep;
    track("onboarding_step_viewed", { step: onboardingStep });
  }, [loading, onboardingComplete, onboardingStep]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        if (!barberId) {
          // no barber yet — keep defaults
          setComplete(false);
          setStep(STEPS.WELCOME);
          setData({});
          setLoading(false);
          return;
        }

        try {
          await refreshFromBackend();
        } catch (backendError) {
          console.log("[ONBOARDING] backend status failed, using local cache", backendError?.message || backendError);
          const complete = await isComplete(barberId);
          const step = normalizeStep(await getStoredStep(barberId));
          const data = await getOnboardingData(barberId);
          const preferredLanguage = resolvePreferredLanguage(null, barber, data);
          const hydratedData = preferredLanguage
            ? { ...(data || {}), preferredLanguage }
            : (data || {});
          const nextStep = resolveInitialStep(step, hydratedData, complete);
          setComplete(complete);
          setStep(nextStep);
          setOnboardingStepMap({});
          setData(hydratedData);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [barberId, refreshFromBackend]);

  const postOnboardingStep = useCallback(async (step, analyticsProps = {}) => {
    if (!barberId) return;
    if (!STEP_VALUES.has(step)) return;
    try {
      const response = await api.post("/onboarding/step", {
        step,
        completed: true,
        data: onboardingData || {},
      });
      console.log(`[ONBOARDING_STEP] posted step=${step} ok=true`);
      const parsed = await hydrateFromBackendStatus(response.data);
      track("onboarding_step_completed", { step, ...analyticsProps });
      return parsed;
    } catch (error) {
      console.log(`[ONBOARDING_STEP] posted step=${step} ok=false`);
      console.log("[ONBOARDING] step post failed", { step, error: error?.response?.data || error?.message || error });
      return null;
    }
  }, [barberId, hydrateFromBackendStatus, onboardingData]);

  const markComplete = useCallback(async () => {
    const status = await refreshFromBackend();
    if (status?.complete) {
      track("onboarding_completed", { step: onboardingStepRef.current || STEPS.TRIAL_START });
      try {
        await refreshSession?.("onboarding_completed");
      } catch (error) {
        console.log("[ONBOARDING] refreshSession after complete failed", error?.message || error);
      }
    }
    return status;
  }, [refreshFromBackend, refreshSession]);

  const updateData = useCallback(async (newData) => {
    if (!barberId) {
      if (__DEV__) console.log("[Onboarding] skipping updateData — barberId not yet available");
      return;
    }
    const updated = { ...(onboardingDataRef.current || {}), ...(newData || {}) };
    setData(updated);
    onboardingDataRef.current = updated;
    try {
      if (__DEV__) console.log(`Onboarding:updateData ${barberId}`);
    } catch (e) {}
    await persistData(barberId, updated);
  }, [barberId]);

  const updateStep = useCallback(async (step, data = {}, options = {}) => {
    const shouldPost = options?.post !== false;
    const analyticsProps = options?.analyticsProps || {};
    if (!barberId) {
      if (__DEV__) console.log("[Onboarding] skipping updateStep — barberId not yet available");
      return;
    }

    // Guard to prevent same-step effect loops in onboarding screens.
    if (
      step === onboardingStepRef.current &&
      Object.keys(data || {}).length === 0 &&
      !shouldPost
    ) {
      return;
    }

    setStep(step);
    try {
      // DEV-only condensed log
      if (__DEV__) console.log(`Onboarding:updateStep ${barberId} -> ${step}`);
    } catch (e) {}
    await persistStep(barberId, step);
    if (Object.keys(data || {}).length > 0) {
      await updateData(data);
    }
    if (shouldPost) {
      return await postOnboardingStep(step, analyticsProps);
    }
    track("onboarding_step_completed", { step, ...analyticsProps });
    return null;
  }, [barberId, postOnboardingStep, updateData]);

  const setLocalStep = useCallback(async (step) => {
    setStep(step);
  }, []);

  const navigateFromBackend = useCallback(async (navigation) => {
    const response = await api.get("/onboarding/status");
    const payload = response?.data || {};
    const status = await hydrateFromBackendStatus(payload);
    const backendStep = String(payload?.currentStep || payload?.nextStep || "").toLowerCase();
    const resolvedStep = String(status?.step || "").toLowerCase();
    const screenName = ONBOARDING_SCREEN_MAP[resolvedStep] || ONBOARDING_SCREEN_MAP[backendStep];
    const routes = navigation?.getState?.()?.routes || [];
    const currentRouteName = routes.length ? routes[routes.length - 1]?.name : "";

    console.log("[ONBOARDING_NAV] route decision", {
      backendStep: backendStep || "(empty)",
      resolvedStep: resolvedStep || "(empty)",
      numberStrategy: payload?.numberStrategy || payload?.phoneStrategy || payload?.phone?.strategy || null,
      currentRoute: currentRouteName || "(none)",
      chosenScreen: screenName || "(none)",
    });

    if (!screenName) {
      console.warn("[ONBOARDING] unknown backend step", resolvedStep || backendStep || "(empty)");
      return status;
    }

    if (currentRouteName === screenName) {
      return status;
    }

    if (navigation?.replace) {
      navigation.replace(screenName);
    }

    return status;
  }, [hydrateFromBackendStatus]);
  const refreshOnboardingStatus = refreshFromBackend;

  const reset = useCallback(async () => {
    if (!barberId) {
      if (__DEV__) console.log("[Onboarding] skipping reset — barberId not yet available");
      return;
    }
    setComplete(false);
    setStep(STEPS.WELCOME);
    setData({});
    try {
      if (__DEV__)
        console.log(`Onboarding:reset ${barberId} (clearing local keys)`);
    } catch (e) {}
    await persistReset(barberId);
  }, [barberId]);

  const value = useMemo(
    () => ({
      loading,
      onboardingComplete,
      onboardingStep,
      onboardingStepMap,
      onboardingData,
      postOnboardingStep,
      refreshFromBackend,
      refreshOnboardingStatus,
      navigateFromBackend,
      markComplete,
      updateStep,
      setLocalStep,
      updateData,
      reset,
    }),
    [
      loading,
      onboardingComplete,
      onboardingStep,
      onboardingStepMap,
      onboardingData,
      postOnboardingStep,
      refreshFromBackend,
      refreshOnboardingStatus,
      navigateFromBackend,
      markComplete,
      updateStep,
      setLocalStep,
      updateData,
      reset,
    ]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}
