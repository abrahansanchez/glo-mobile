import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OnboardingContext } from "../onboarding/OnboardingContext";

import WelcomeScreen from "../screens/onboarding/WelcomeScreen";
import PhoneSignupScreen from "../screens/onboarding/PhoneSignupScreen";
import BusinessSetupScreen from "../screens/onboarding/BusinessSetupScreen";
import TrialStartScreen from "../screens/onboarding/TrialStartScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { STEPS } from "../onboarding/stepKeys";

const Stack = createNativeStackNavigator();

export default function StableOnboardingNavigator() {
  const { onboardingStep } = useContext(OnboardingContext);

  // Stable flow intentionally skips elite-only steps while keeping route names safe.
  function getInitialRouteName() {
    switch (onboardingStep) {
      case STEPS.ACCOUNT:
        return "Account";
      case STEPS.BUSINESS_SNAPSHOT:
        return "BusinessSnapshot";
      case STEPS.TRIAL_START:
      case STEPS.NUMBER_STRATEGY:
      case "porting_form":
      case "porting_tracker":
      case "go_live_checklist":
      case "porting_documents":
        return "TrialStart";
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
      <Stack.Screen name="TrialStart" component={TrialStartScreen} />

      {/* Keep known route names available to avoid navigation crashes in rollback mode. */}
      <Stack.Screen name="NumberStrategy" component={TrialStartScreen} />
      <Stack.Screen name="PortingForm" component={TrialStartScreen} />
      <Stack.Screen name="PortingTracker" component={TrialStartScreen} />
      <Stack.Screen name="PortingStatus" component={TrialStartScreen} />
      <Stack.Screen name="PortingDocuments" component={TrialStartScreen} />
      <Stack.Screen name="GoLiveChecklist" component={TrialStartScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
