import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";

const ELITE_FLAG_KEY = "glo_ff_elite_onboarding";

const configFlag = Constants?.expoConfig?.extra?.featureFlags?.ELITE_ONBOARDING;
const productionDefaultElite = typeof configFlag === "boolean" ? configFlag : false;

export const FEATURE_FLAGS = Object.freeze({
  // Default false in production unless explicitly set in Expo extra.featureFlags.
  ELITE_ONBOARDING: productionDefaultElite,
});

function parseStoredBool(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export async function getEliteOnboardingFlag() {
  if (!__DEV__) return FEATURE_FLAGS.ELITE_ONBOARDING;

  try {
    const stored = await SecureStore.getItemAsync(ELITE_FLAG_KEY);
    const parsed = parseStoredBool(stored);
    return parsed === null ? FEATURE_FLAGS.ELITE_ONBOARDING : parsed;
  } catch {
    return FEATURE_FLAGS.ELITE_ONBOARDING;
  }
}

export async function setEliteOnboardingFlag(enabled) {
  if (!__DEV__) return FEATURE_FLAGS.ELITE_ONBOARDING;

  const boolValue = !!enabled;
  await SecureStore.setItemAsync(ELITE_FLAG_KEY, boolValue ? "true" : "false");
  return boolValue;
}

export function useEliteOnboardingFlag() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(FEATURE_FLAGS.ELITE_ONBOARDING);

  const reload = useCallback(async () => {
    setLoading(true);
    const value = await getEliteOnboardingFlag();
    setEnabled(value);
    setLoading(false);
    return value;
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    enabled,
    loading,
    reload,
    setEnabled,
  };
}
