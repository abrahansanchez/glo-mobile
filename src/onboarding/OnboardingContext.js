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

export const OnboardingContext = createContext(null);

function normalizeStep(step) {
  if (!step || typeof step !== "string") return STEPS.WELCOME;
  const value = step.toLowerCase();
  const legacyMap = {
    welcome: STEPS.WELCOME,
    account: STEPS.ACCOUNT,
    phone: STEPS.ACCOUNT,
    business_setup: STEPS.BUSINESS_SNAPSHOT,
    business_snapshot: STEPS.BUSINESS_SNAPSHOT,
    phone_choice: STEPS.NUMBER_STRATEGY,
    number_strategy: STEPS.NUMBER_STRATEGY,
    trial_start: STEPS.TRIAL_START,
  };
  return legacyMap[value] || value;
}

function parseOnboardingStatus(payload) {
  const raw = payload || {};
  const step = normalizeStep(raw?.nextStep || raw?.currentStep || STEPS.WELCOME);
  const complete = Boolean(raw?.isComplete);
  const stepMap = raw?.stepMap || {};
  return { step, complete, stepMap };
}

export function OnboardingProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setComplete] = useState(false);
  const [onboardingStep, setStep] = useState(STEPS.WELCOME);
  const [onboardingStepMap, setOnboardingStepMap] = useState({});
  const [onboardingData, setData] = useState({});
  const { barber } = useContext(AuthContext);
  const barberId = barber?.id || barber?._id || null;
  const onboardingStepRef = useRef(STEPS.WELCOME);
  const onboardingDataRef = useRef({});

  useEffect(() => {
    onboardingStepRef.current = onboardingStep;
  }, [onboardingStep]);

  useEffect(() => {
    onboardingDataRef.current = onboardingData || {};
  }, [onboardingData]);

  useEffect(() => {
    (async () => {
      try {
        if (!barberId) {
          // no barber yet — keep defaults
          setComplete(false);
          setStep(STEPS.WELCOME);
          setData({});
          setLoading(false);
          return;
        }

        try {
          const response = await api.get("/onboarding/status");
          const parsed = parseOnboardingStatus(response.data);
          const cachedData = await getOnboardingData(barberId);
          setComplete(parsed.complete);
          setStep(parsed.step);
          setOnboardingStepMap(parsed.stepMap);
          setData(cachedData || {});
          await persistComplete(barberId, parsed.complete);
          await persistStep(barberId, parsed.step);
          console.log("[ONBOARDING] loaded from backend status", {
            step: parsed.step,
            complete: parsed.complete,
          });
        } catch (backendError) {
          console.log("[ONBOARDING] backend status failed, using local cache", backendError?.message || backendError);
          const complete = await isComplete(barberId);
          const step = normalizeStep(await getStoredStep(barberId));
          const data = await getOnboardingData(barberId);
          setComplete(complete);
          setStep(step);
          setOnboardingStepMap({});
          setData(data);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [barberId]);

  const postOnboardingStep = useCallback(async (step) => {
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
    } catch (error) {
      console.log(`[ONBOARDING_STEP] posted step=${step} ok=false`);
      console.log("[ONBOARDING] step post failed", { step, error: error?.response?.data || error?.message || error });
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
  }, [barberId]);

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
    if (!barberId) {
      if (__DEV__) console.log("[Onboarding] skipping updateStep — barberId not yet available");
      return;
    }

    // Guard to prevent same-step effect loops in onboarding screens.
    if (step === onboardingStepRef.current && Object.keys(data || {}).length === 0) {
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
      await postOnboardingStep(step);
    }
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
