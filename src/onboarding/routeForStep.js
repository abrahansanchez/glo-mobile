import { ONBOARDING_SCREEN_MAP } from "../navigation/onboardingScreenMap";

export function routeForOnboardingStep(rawStep) {
  const step = String(rawStep || "").toLowerCase();
  return ONBOARDING_SCREEN_MAP[step] || ONBOARDING_SCREEN_MAP.welcome;
}
