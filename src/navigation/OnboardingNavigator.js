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
import AIIntroScreen from "../screens/onboarding/AIIntroScreen";
import CelebrationScreen from "../screens/onboarding/CelebrationScreen";
import PermissionsScreen from "../screens/onboarding/PermissionsScreen";
import { ONBOARDING_SCREEN_MAP } from "./onboardingScreenMap";

const Stack = createNativeStackNavigator();
export { ONBOARDING_SCREEN_MAP } from "./onboardingScreenMap";

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerTitle: "",
        headerBackTitle: "",
        headerTintColor: "#ffffff",
        gestureEnabled: true,
        gestureDirection: "horizontal",
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ gestureEnabled: false, headerShown: false }} />
      <Stack.Screen name="Language" component={LanguageScreen} options={{ gestureEnabled: false, headerShown: false }} />
      <Stack.Screen name="Account" component={PhoneSignupScreen} options={{ gestureEnabled: false, headerShown: false }} />
      <Stack.Screen name="BusinessSnapshot" component={BusinessSetupScreen} />
      <Stack.Screen name="NumberStrategy" component={NumberStrategyScreen} />
      <Stack.Screen name="AIIntro" component={AIIntroScreen} />
      <Stack.Screen name="ForwardingFlow" component={ForwardingFlowScreen} />
      <Stack.Screen name="ForwardingSetup" component={ForwardingSetupScreen} />
      <Stack.Screen name="ForwardingVerification" component={ForwardingVerificationScreen} />
      <Stack.Screen name="ForwardingSuccess" component={ForwardingSuccessScreen} />
      <Stack.Screen name="PortingFlow" component={PortingFlowScreen} />
      <Stack.Screen name="PortingForm" component={PortingFlowScreen} />
      <Stack.Screen name="TrialStart" component={TrialStartScreen} />
      <Stack.Screen name="Permissions" component={PermissionsScreen} />
      <Stack.Screen name="GoLiveChecklist" component={GoLiveChecklistScreen} options={{ gestureEnabled: false, headerShown: false }} />
      <Stack.Screen name="Celebration" component={CelebrationScreen} options={{ gestureEnabled: false, headerShown: false }} />
      <Stack.Screen name="PortingStatus" component={PortingStatusScreen} />
      <Stack.Screen name="PortingDocuments" component={PortingDocumentsScreen} />
    </Stack.Navigator>
  );
}
