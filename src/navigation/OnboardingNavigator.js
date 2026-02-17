import React, { useContext, useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OnboardingContext } from "../onboarding/OnboardingContext";

import WelcomeScreen from "../screens/onboarding/WelcomeScreen";
import PhoneSignupScreen from "../screens/onboarding/PhoneSignupScreen";
import ProfileBasicsScreen from "../screens/onboarding/ProfileBasicsScreen";
import BusinessSetupScreen from "../screens/onboarding/BusinessSetupScreen";
import ServicesSetupScreen from "../screens/onboarding/ServicesSetupScreen";
import PhoneNumberChoiceScreen from "../screens/onboarding/PhoneNumberChoiceScreen";
import CalendarConnectScreen from "../screens/onboarding/CalendarConnectScreen";
import AvailabilitySetupScreen from "../screens/onboarding/AvailabilitySetupScreen";
import NumberChoiceScreen from "../screens/onboarding/NumberChoiceScreen";
import NumberSetupScreen from "../screens/onboarding/NumberSetupScreen";
import PermissionsScreen from "../screens/onboarding/PermissionsScreen";
import OnboardingCompleteScreen from "../screens/onboarding/OnboardingCompleteScreen";
import GoLiveScreen from "../screens/onboarding/GoLiveScreen";

const Stack = createNativeStackNavigator();

export default function OnboardingNavigator() {
  const { onboardingStep } = useContext(OnboardingContext);

  // This navigator supports resume by step.
  // We route by setting the initial screen based on stored onboardingStep.
  function getInitialRouteName() {
    switch (onboardingStep) {
      case "PHONE":
        return "PhoneSignup";
      case "PROFILE":
        return "ProfileBasics";
      case "BUSINESS_SETUP":
        return "BusinessSetup";
      case "SERVICES_SETUP":
        return "Services";
      case "PHONE_CHOICE":
        return "PhoneChoice";
      case "CALENDAR_CONNECT":
        return "CalendarConnect";
      case "AVAILABILITY":
        return "Availability";
      case "NUMBER_CHOICE":
        return "NumberChoice";
      case "NUMBER_SETUP":
        return "NumberSetup";
      case "PERMISSIONS":
        return "Permissions";
      case "ONBOARDING_COMPLETE":
        return "OnboardingComplete";
      case "GO_LIVE":
        return "GoLive";
      case "WELCOME":
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
      <Stack.Screen name="PhoneSignup" component={PhoneSignupScreen} />
      <Stack.Screen name="ProfileBasics" component={ProfileBasicsScreen} />
      <Stack.Screen name="BusinessSetup" component={BusinessSetupScreen} />
      <Stack.Screen name="Services" component={ServicesSetupScreen} />
      <Stack.Screen name="PhoneChoice" component={PhoneNumberChoiceScreen} />
      <Stack.Screen name="CalendarConnect" component={CalendarConnectScreen} />
      <Stack.Screen name="Availability" component={AvailabilitySetupScreen} />
      <Stack.Screen name="NumberChoice" component={NumberChoiceScreen} />
      <Stack.Screen name="NumberSetup" component={NumberSetupScreen} />
      <Stack.Screen name="Permissions" component={PermissionsScreen} />
      <Stack.Screen name="OnboardingComplete" component={OnboardingCompleteScreen} />
      <Stack.Screen name="GoLive" component={GoLiveScreen} />
    </Stack.Navigator>
  );
}
