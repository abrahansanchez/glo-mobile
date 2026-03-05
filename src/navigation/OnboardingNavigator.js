import React from "react";
import { View } from "react-native";

import EliteOnboardingNavigator from "./EliteOnboardingNavigator";
import StableOnboardingNavigator from "./StableOnboardingNavigator";
import LoadingState from "../components/LoadingState";
import { useEliteOnboardingFlag } from "../config/featureFlags";

export default function OnboardingNavigator() {
  const { enabled, loading } = useEliteOnboardingFlag();

  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <LoadingState message="Loading onboarding..." />
      </View>
    );
  }

  return enabled ? <EliteOnboardingNavigator /> : <StableOnboardingNavigator />;
}
