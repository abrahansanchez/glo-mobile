import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import WelcomeScreen from "../screens/onboarding/WelcomeScreen";
import LanguageScreen from "../screens/onboarding/LanguageScreen";
import PhoneSignupScreen from "../screens/onboarding/PhoneSignupScreen";
import BusinessSetupScreen from "../screens/onboarding/BusinessSetupScreen";
import NumberStrategyScreen from "../screens/onboarding/NumberStrategyScreen";
import ForwardingFlowScreen from "../screens/onboarding/ForwardingFlowScreen";
import ForwardingSetupScreen from "../screens/onboarding/ForwardingSetupScreen";
import ForwardingVerificationScreen from "../screens/onboarding/ForwardingVerificationScreen";
import PortingFlowScreen from "../screens/onboarding/PortingFlowScreen";
import TrialStartScreen from "../screens/onboarding/TrialStartScreen";
import GoLiveChecklistScreen from "../screens/onboarding/GoLiveChecklistScreen";
import PortingStatusScreen from "../screens/onboarding/PortingStatusScreen";
import PortingDocumentsScreen from "../screens/onboarding/PortingDocumentsScreen";
import ForwardingSuccessScreen from "../screens/onboarding/ForwardingSuccessScreen";
import { ONBOARDING_SCREEN_MAP } from "./onboardingScreenMap";

const Stack = createNativeStackNavigator();
export { ONBOARDING_SCREEN_MAP } from "./onboardingScreenMap";

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="Account" component={PhoneSignupScreen} />
      <Stack.Screen name="BusinessSnapshot" component={BusinessSetupScreen} />
      <Stack.Screen name="NumberStrategy" component={NumberStrategyScreen} />
      <Stack.Screen name="ForwardingFlow" component={ForwardingFlowScreen} />
      <Stack.Screen name="ForwardingSetup" component={ForwardingSetupScreen} />
      <Stack.Screen name="ForwardingVerification" component={ForwardingVerificationScreen} />
      <Stack.Screen name="ForwardingVerify" component={ForwardingVerificationScreen} />
      <Stack.Screen name="ForwardingSuccess" component={ForwardingSuccessScreen} />
      <Stack.Screen name="PortingFlow" component={PortingFlowScreen} />
      <Stack.Screen name="PortingForm" component={PortingFlowScreen} />
      <Stack.Screen name="TrialStart" component={TrialStartScreen} />
      <Stack.Screen name="GoLiveChecklist" component={GoLiveChecklistScreen} />
      <Stack.Screen name="PortingStatus" component={PortingStatusScreen} />
      <Stack.Screen name="PortingDocuments" component={PortingDocumentsScreen} />
    </Stack.Navigator>
  );
}
