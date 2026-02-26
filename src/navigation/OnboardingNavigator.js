import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OnboardingContext } from "../onboarding/OnboardingContext";

import WelcomeScreen from "../screens/onboarding/WelcomeScreen";
import PhoneSignupScreen from "../screens/onboarding/PhoneSignupScreen";
import BusinessSetupScreen from "../screens/onboarding/BusinessSetupScreen";
import NumberStrategyScreen from "../screens/onboarding/NumberStrategyScreen";
import TrialStartScreen from "../screens/onboarding/TrialStartScreen";
import PortingFormScreen from "../screens/onboarding/PortingFormScreen";
import PortingTrackerScreen from "../screens/onboarding/PortingTrackerScreen";
import PortingStatusScreen from "../screens/onboarding/PortingStatusScreen";
import PortingDocumentsScreen from "../screens/onboarding/PortingDocumentsScreen";
import GoLiveChecklistScreen from "../screens/onboarding/GoLiveChecklistScreen";
import { STEPS } from "../onboarding/stepKeys";

const Stack = createNativeStackNavigator();

export default function OnboardingNavigator() {
  const { onboardingStep } = useContext(OnboardingContext);

  // This navigator supports resume by step.
  // We route by setting the initial screen based on stored onboardingStep.
  function getInitialRouteName() {
    switch (onboardingStep) {
      case STEPS.ACCOUNT:
        return "Account";
      case STEPS.BUSINESS_SNAPSHOT:
        return "BusinessSnapshot";
      case STEPS.NUMBER_STRATEGY:
        return "NumberStrategy";
      case STEPS.TRIAL_START:
        return "TrialStart";
      case "porting_form":
        return "PortingForm";
      case "porting_tracker":
        return "PortingStatus";
      case "go_live_checklist":
        return "GoLiveChecklist";
      case "porting_documents":
        return "PortingDocuments";
      case STEPS.WELCOME:
      default:
        return "Welcome";
    }
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={getInitialRouteName()}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Account" component={PhoneSignupScreen} />
      <Stack.Screen name="BusinessSnapshot" component={BusinessSetupScreen} />
      <Stack.Screen name="NumberStrategy" component={NumberStrategyScreen} />
      <Stack.Screen name="TrialStart" component={TrialStartScreen} />
      <Stack.Screen name="PortingForm" component={PortingFormScreen} />
      <Stack.Screen name="PortingTracker" component={PortingTrackerScreen} />
      <Stack.Screen name="PortingStatus" component={PortingStatusScreen} />
      <Stack.Screen name="PortingDocuments" component={PortingDocumentsScreen} />
      <Stack.Screen name="GoLiveChecklist" component={GoLiveChecklistScreen} />
    </Stack.Navigator>
  );
}
