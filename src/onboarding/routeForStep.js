import { STEPS } from "./stepKeys";

export function routeForOnboardingStep(rawStep) {
  const step = String(rawStep || "").toLowerCase();

  switch (step) {
    case STEPS.ACCOUNT:
      return "Account";
    case STEPS.BUSINESS_SNAPSHOT:
      return "BusinessSnapshot";
    case STEPS.NUMBER_STRATEGY:
      return "NumberStrategy";
    case STEPS.FORWARDING_SETUP:
      return "ForwardingSetup";
    case STEPS.FORWARDING_VERIFICATION:
      return "ForwardingVerify";
    case "porting_form":
      return "PortingForm";
    case "porting_tracker":
    case "porting_status":
      return "PortingStatus";
    case "porting_documents":
      return "PortingDocuments";
    case "go_live_checklist":
      return "GoLiveChecklist";
    case STEPS.TRIAL_START:
      return "TrialStart";
    case STEPS.WELCOME:
    default:
      return "Welcome";
  }
}
