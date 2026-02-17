import React, { createContext, useEffect, useMemo, useState, useContext } from "react";
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

export const OnboardingContext = createContext(null);

export function OnboardingProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setComplete] = useState(false);
  const [onboardingStep, setStep] = useState("WELCOME");
  const [onboardingData, setData] = useState({});
  const { barber } = useContext(AuthContext);
  const barberId = barber?.id || barber?._id || null;

  useEffect(() => {
    (async () => {
      try {
        if (!barberId) {
          // no barber yet — keep defaults
          setComplete(false);
          setStep("WELCOME");
          setData({});
          setLoading(false);
          return;
        }

        const complete = await isComplete(barberId);
        const step = await getStoredStep(barberId);
        const data = await getOnboardingData(barberId);
        setComplete(complete);
        setStep(step);
        setData(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [barberId]);

  async function markComplete() {
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
  }

  async function updateStep(step) {
    if (!barberId) {
      if (__DEV__) console.log("[Onboarding] skipping updateStep — barberId not yet available");
      return;
    }
    setStep(step);
    try {
      // DEV-only condensed log
      if (__DEV__) console.log(`Onboarding:updateStep ${barberId} -> ${step}`);
    } catch (e) {}
    await persistStep(barberId, step);
  }

  async function updateData(newData) {
    if (!barberId) {
      if (__DEV__) console.log("[Onboarding] skipping updateData — barberId not yet available");
      return;
    }
    const updated = { ...onboardingData, ...newData };
    setData(updated);
    try {
      if (__DEV__) console.log(`Onboarding:updateData ${barberId}`);
    } catch (e) {}
    await persistData(barberId, updated);
  }

  async function reset() {
    if (!barberId) {
      if (__DEV__) console.log("[Onboarding] skipping reset — barberId not yet available");
      return;
    }
    setComplete(false);
    setStep("WELCOME");
    setData({});
    try {
      if (__DEV__)
        console.log(`Onboarding:reset ${barberId} (clearing local keys)`);
    } catch (e) {}
    await persistReset(barberId);
  }

  const value = useMemo(
    () => ({
      loading,
      onboardingComplete,
      onboardingStep,
      onboardingData,
      markComplete,
      updateStep,
      updateData,
      reset,
    }),
    [loading, onboardingComplete, onboardingStep, onboardingData]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

