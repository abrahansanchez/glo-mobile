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

  useEffect(() => {
    if (!authenticated) return;
    if (subscriptionStatus !== "unknown") return;
    refreshSession?.("route_unknown_status");
  }, [authenticated, subscriptionStatus, refreshSession]);

  if (authLoading || onboardingLoading) {
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
      {!authenticated ? (
        <AuthNavigator />
      ) : subscriptionStatus === "required" ? (
        <SubscriptionGateScreen reason={subscriptionReason} />
      ) : (
        <AuthenticatedNavigator onboardingComplete={onboardingComplete} />
      )}
    </NavigationContainer>
  );
}
