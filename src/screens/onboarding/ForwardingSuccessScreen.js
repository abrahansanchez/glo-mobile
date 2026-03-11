import React, { useContext, useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import api from "../../config/api";
import OnboardingHeader from "../../onboarding/OnboardingHeader";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import AppText from "../../components/ui/AppText";
import OnboardingHero from "../../components/onboarding/OnboardingHero";
import { routeForOnboardingStep } from "../../onboarding/routeForStep";
import { STEPS } from "../../onboarding/stepKeys";
import { spacing } from "../../ui/tokens";
import { useTheme } from "../../theme/ThemeContext";

export default function ForwardingSuccessScreen({ navigation }) {
  const { colors, resolvedTheme } = useTheme();
  const { setLocalStep, markComplete } = useContext(OnboardingContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLocalStep(STEPS.FORWARDING_VERIFICATION);
  }, [setLocalStep]);

  async function handleContinue() {
    setLoading(true);
    setError("");

    try {
      await api.post("/onboarding/step", {
        step: STEPS.FORWARDING_VERIFICATION,
        status: "complete",
      });

      const response = await api.get("/onboarding/status");
      const payload = response.data || {};
      const nextStep = String(payload?.nextStep || payload?.currentStep || STEPS.TRIAL_START).toLowerCase();
      const nextRoute = routeForOnboardingStep(nextStep);

      if (payload?.isComplete || nextStep === "dashboard") {
        await markComplete();
        return;
      }

      await setLocalStep(nextStep);
      if (navigation?.getState?.()?.routeNames?.includes(nextRoute)) {
        navigation.navigate(nextRoute);
        return;
      }

      navigation.navigate("TrialStart");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to continue onboarding");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <OnboardingHeader />
      <OnboardingHero
        stepLabel="Step 7 of 9"
        title="Forwarding Verified"
        subtitle="Your clients can keep calling the same number while Glō handles the calls."
      />

      <AppCard
        style={[
          styles.successCard,
          {
            borderColor: colors.success,
            backgroundColor: resolvedTheme === "dark" ? "#12382c" : "#ecfdf5",
          },
        ]}
      >
        <AppText style={[styles.successTitle, { color: colors.success }]}>Forwarding Verified ✓</AppText>
        <AppText style={[styles.successText, { color: colors.success }]}>
          Your clients can keep calling the same number while Glō handles the calls.
        </AppText>
      </AppCard>

      {!!error ? <AppText style={[styles.error, { color: colors.danger }]}>{error}</AppText> : null}

      <AppButton
        label={loading ? "Continuing..." : "Continue"}
        onPress={handleContinue}
        disabled={loading}
        style={styles.button}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    justifyContent: "center",
  },
  successCard: {
    borderWidth: 2,
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: spacing.xs,
  },
  successText: {
    fontWeight: "700",
  },
  button: {
    marginTop: spacing.xs,
  },
  error: {
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
});
