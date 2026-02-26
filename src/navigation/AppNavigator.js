import { useContext, useEffect } from "react";
import { View, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";

import { AuthContext } from "../auth/authContext";
import { OnboardingContext } from "../onboarding/OnboardingContext";

import AuthNavigator from "./AuthNavigator";
import OnboardingNavigator from "./OnboardingNavigator";
import DashboardNavigator from "./DashboardNavigator";
import SubscriptionGateScreen from "../screens/SubscriptionGateScreen";

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

  // Show loading while any async state is being restored
  if (authLoading || onboardingLoading) {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // If authenticated but barber not yet restored, show loading
  if (authenticated && !barber) {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: "center", alignItems: "center" }}>
        <Text>Restoring your profile...</Text>
      </View>
    );
  }

  // DEV: Log routing truth
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
      ) : !onboardingComplete ? (
        <OnboardingNavigator />
      ) : (
        <DashboardNavigator />
      )}
    </NavigationContainer>
  );
}
