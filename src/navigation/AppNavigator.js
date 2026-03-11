import { useContext, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";

import { AuthContext } from "../auth/authContext";
import { OnboardingContext } from "../onboarding/OnboardingContext";

import AuthNavigator from "./AuthNavigator";
import OnboardingNavigator from "./OnboardingNavigator";
import DashboardNavigator from "./DashboardNavigator";
import SubscriptionGateScreen from "../screens/SubscriptionGateScreen";
import LoadingState from "../components/LoadingState";

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
    return <LoadingState message="Loading..." />;
  }

  // If authenticated but barber not yet restored, show loading
  if (authenticated && !barber) {
    return <LoadingState message="Restoring your profile..." />;
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
