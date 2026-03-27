import { ONBOARDING_SCREEN_MAP } from "../navigation/onboardingScreenMap";

export function routeForOnboardingStep(rawStep) {
  const step = String(rawStep || "").toLowerCase();
  const normalizedStep = step === "forwarding_flow" ? "forwarding_setup" : step;
  return ONBOARDING_SCREEN_MAP[normalizedStep] || ONBOARDING_SCREEN_MAP.welcome;
}
