import { useContext, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthContext } from "../auth/authContext";
import { OnboardingContext } from "../onboarding/OnboardingContext";

import AuthNavigator from "./AuthNavigator";
import OnboardingNavigator from "./OnboardingNavigator";
import DashboardNavigator from "./DashboardNavigator";
import SubscriptionGateScreen from "../screens/SubscriptionGateScreen";
import IncomingCallScreen from "../screens/call/IncomingCallScreen";
import LoadingState from "../components/LoadingState";
import { SetupModeContext } from "../setup/SetupModeContext";
import {
  selectAuthenticationDestination,
  selectSetupModeRoute,
} from "../setup/setupModeContract";
import SetupModeScreen from "../screens/setup/SetupModeScreen";
import PhoneSetupChoiceScreen from "../screens/setup/PhoneSetupChoiceScreen";
import TrialStartScreen from "../screens/onboarding/TrialStartScreen";
import ForwardingSetupScreen from "../screens/onboarding/ForwardingSetupScreen";
import ForwardingVerifyScreen from "../screens/onboarding/ForwardingVerifyScreen";
import PhoneSetupRecoveryScreen from "../screens/setup/PhoneSetupRecoveryScreen";
import BusinessSetupScreen from "../screens/onboarding/BusinessSetupScreen";
import ServicesScreen from "../screens/settings/ServicesScreen";
import BusinessHoursScreen from "../screens/settings/BusinessHoursScreen";
import AIIntroScreen from "../screens/onboarding/AIIntroScreen";

const Stack = createNativeStackNavigator();

function AuthenticatedNavigator({ onboardingComplete }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!onboardingComplete ? (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : (
        <Stack.Screen name="Dashboard" component={DashboardNavigator} />
      )}
      <Stack.Screen
        name="IncomingCall"
        component={IncomingCallScreen}
        options={{ presentation: "modal", headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function SetupModeNavigator({ initialRouteName = "SetupModeHome" }) {
  return (
    <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SetupModeHome" component={SetupModeScreen} />
      <Stack.Screen name="SetupPayment" component={TrialStartScreen} />
      <Stack.Screen name="PhoneSetupChoice" component={PhoneSetupChoiceScreen} />
      <Stack.Screen name="PhoneSetupRecovery" component={PhoneSetupRecoveryScreen} />
      <Stack.Screen name="BusinessProfile" component={BusinessSetupScreen} />
      <Stack.Screen name="SetupServices" component={ServicesScreen} />
      <Stack.Screen name="SetupBusinessHours" component={BusinessHoursScreen} />
      <Stack.Screen name="SetupAI" component={AIIntroScreen} />
      <Stack.Screen name="ForwardingSetup" component={ForwardingSetupScreen} />
      <Stack.Screen name="ForwardingVerification" component={ForwardingVerifyScreen} />
      <Stack.Screen name="IncomingCall" component={IncomingCallScreen} options={{ presentation: "modal" }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const {
    authenticated,
    loading: authLoading,
    barber,
    subscriptionStatus,
    subscriptionReason,
    refreshSession,
  } = useContext(AuthContext);
  const { loading: onboardingLoading, onboardingComplete } = useContext(OnboardingContext);
  const setupMode = useContext(SetupModeContext);
  const setupRoute = selectSetupModeRoute({
    clientEnabled: setupMode?.clientEnabled,
    readiness: setupMode?.readiness,
    onboardingComplete,
  });
  const authenticationDestination = selectAuthenticationDestination(authenticated);

  useEffect(() => {
    if (!authenticated) return;
    if (subscriptionStatus !== "unknown") return;
    refreshSession?.("route_unknown_status");
  }, [authenticated, subscriptionStatus, refreshSession]);

  if (authLoading || onboardingLoading || (authenticated && setupMode?.loading)) {
    return <LoadingState message="Loading..." />;
  }

  if (authenticated && !barber) {
    return <LoadingState message="Restoring your profile..." />;
  }

  if (__DEV__) {
    console.log("[ROUTE_DECISION]", {
      authenticated,
      subscriptionStatus,
      hasBarber: !!barber,
      barberId: barber?.id || barber?._id,
      onboardingComplete,
    });
  }

  return (
    <NavigationContainer>
      {authenticationDestination === "unauthenticated" ? (
        <AuthNavigator />
      ) : setupRoute === "setup_payment" ? (
        <SetupModeNavigator key="setup-payment" initialRouteName="SetupPayment" />
      ) : setupRoute === "setup_mode" || setupRoute === "setup_recovery" ? (
        <SetupModeNavigator key="setup-mode" />
      ) : setupRoute === "setup_dashboard" ? (
        <AuthenticatedNavigator onboardingComplete={true} />
      ) : subscriptionStatus === "required" ? (
        <SubscriptionGateScreen reason={subscriptionReason} />
      ) : (
        <AuthenticatedNavigator onboardingComplete={onboardingComplete} />
      )}
    </NavigationContainer>
  );
}
