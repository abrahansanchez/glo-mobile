import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OnboardingContext } from "../onboarding/OnboardingContext";

import LanguageSelectionScreen from "../screens/onboarding/LanguageSelectionScreen";
import WelcomeScreen from "../screens/onboarding/WelcomeScreen";
import PhoneSignupScreen from "../screens/onboarding/PhoneSignupScreen";
import BusinessSetupScreen from "../screens/onboarding/BusinessSetupScreen";
import NumberStrategyScreen from "../screens/onboarding/NumberStrategyScreen";
import ForwardingSetupScreen from "../screens/onboarding/ForwardingSetupScreen";
import ForwardingVerifyScreen from "../screens/onboarding/ForwardingVerifyScreen";
import ForwardingSuccessScreen from "../screens/onboarding/ForwardingSuccessScreen";
import TrialStartScreen from "../screens/onboarding/TrialStartScreen";
import PortingFormScreen from "../screens/onboarding/PortingFormScreen";
import PortingTrackerScreen from "../screens/onboarding/PortingTrackerScreen";
import PortingStatusScreen from "../screens/onboarding/PortingStatusScreen";
import PortingDocumentsScreen from "../screens/onboarding/PortingDocumentsScreen";
import GoLiveChecklistScreen from "../screens/onboarding/GoLiveChecklistScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { routeForOnboardingStep } from "../onboarding/routeForStep";

const Stack = createNativeStackNavigator();

export default function EliteOnboardingNavigator() {
  const { onboardingStep } = useContext(OnboardingContext);

  function getInitialRouteName() {
    return routeForOnboardingStep(onboardingStep);
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={getInitialRouteName()}
    >
      <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Account" component={PhoneSignupScreen} />
      <Stack.Screen name="BusinessSnapshot" component={BusinessSetupScreen} />
      <Stack.Screen name="NumberStrategy" component={NumberStrategyScreen} />
      <Stack.Screen name="ForwardingSetup" component={ForwardingSetupScreen} />
      <Stack.Screen name="ForwardingVerify" component={ForwardingVerifyScreen} />
      <Stack.Screen name="ForwardingSuccess" component={ForwardingSuccessScreen} />
      <Stack.Screen name="TrialStart" component={TrialStartScreen} />
      <Stack.Screen name="PortingForm" component={PortingFormScreen} />
      <Stack.Screen name="PortingTracker" component={PortingTrackerScreen} />
      <Stack.Screen name="PortingStatus" component={PortingStatusScreen} />
      <Stack.Screen name="PortingDocuments" component={PortingDocumentsScreen} />
      <Stack.Screen name="GoLiveChecklist" component={GoLiveChecklistScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
