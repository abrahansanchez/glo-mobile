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

function resolveInitialStep(step, data, complete) {
  if (complete) return step;
  if (!normalizeLanguage(data?.preferredLanguage)) {
    return STEPS.LANGUAGE;
  }
  if (step === STEPS.LANGUAGE) {
    return STEPS.WELCOME;
  }
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
          const cachedData = await getOnboardingData(barberId);
          const response = await api.get("/onboarding/status");
          const parsed = parseOnboardingStatus(response.data);
          const preferredLanguage = resolvePreferredLanguage(response.data, barber, cachedData);
          const hydratedData = preferredLanguage
            ? { ...(cachedData || {}), preferredLanguage }
            : (cachedData || {});
          const nextStep = resolveInitialStep(parsed.step, hydratedData, parsed.complete);
          setComplete(parsed.complete);
          setStep(nextStep);
          setOnboardingStepMap(parsed.stepMap);
          setData(hydratedData);
          await persistComplete(barberId, parsed.complete);
          await persistStep(barberId, nextStep);
          await persistData(barberId, hydratedData);
          console.log("[ONBOARDING] loaded from backend status", {
            step: nextStep,
            complete: parsed.complete,
          });
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
  }, [barberId]);

  const postOnboardingStep = useCallback(async (step, analyticsProps = {}) => {
    if (!barberId) return;
    if (!STEP_VALUES.has(step)) return;
    try {
      const response = await api.post("/onboarding/step", {
        step,
        completed: true,
      });
      console.log(`[ONBOARDING_STEP] posted step=${step} ok=true`);

      const parsed = parseOnboardingStatus(response.data);
      if (parsed.step) {
        setStep(parsed.step);
        await persistStep(barberId, parsed.step);
      }
      if (typeof parsed.complete === "boolean") {
        setComplete(parsed.complete);
        await persistComplete(barberId, parsed.complete);
      }
      if (parsed.stepMap && typeof parsed.stepMap === "object") {
        setOnboardingStepMap(parsed.stepMap);
      }
      track("onboarding_step_completed", { step, ...analyticsProps });
      return parsed;
    } catch (error) {
      console.log(`[ONBOARDING_STEP] posted step=${step} ok=false`);
      console.log("[ONBOARDING] step post failed", { step, error: error?.response?.data || error?.message || error });
      return null;
    }
  }, [barberId]);

  const markComplete = useCallback(async () => {
    if (!barberId) {
      if (__DEV__) console.log("[Onboarding] skipping markComplete — barberId not yet available");
      return;
    }
    setComplete(true);
    // DEV LOG: barberId and keys being written
    try {
      // DEV-only verbose log
      if (__DEV__) console.log(`Onboarding: markComplete for barberId=${barberId}`);
    } catch (e) {}
    await persistComplete(barberId, true);
    track("onboarding_completed", { step: onboardingStepRef.current || STEPS.TRIAL_START });
    try {
      await refreshSession?.("onboarding_completed");
    } catch (error) {
      console.log("[ONBOARDING] refreshSession after complete failed", error?.message || error);
    }
  }, [barberId, refreshSession]);

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

  const reset = useCallback(async () => {
    if (!barberId) {
      if (__DEV__) console.log("[Onboarding] skipping reset — barberId not yet available");
      return;
    }
    setComplete(false);
    setStep(STEPS.LANGUAGE);
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
