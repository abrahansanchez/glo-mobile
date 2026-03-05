import React, { useContext, useState } from "react";
import { View, StyleSheet } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import { AuthContext } from "../../auth/authContext";
import api from "../../config/api";
import OnboardingHeader from "../../onboarding/OnboardingHeader";
import { STEPS } from "../../onboarding/stepKeys";
import AppCard from "../../components/ui/AppCard";
import AppText from "../../components/ui/AppText";
import AppBadge from "../../components/ui/AppBadge";
import AppButton from "../../components/ui/AppButton";
import OnboardingHero from "../../components/onboarding/OnboardingHero";
import { colors, spacing } from "../../ui/tokens";
import { track } from "../../analytics/track";

export default function TrialStartScreen({ navigation }) {
  const { updateStep } = useContext(OnboardingContext);
  const { refreshSession } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function canNavigateTo(routeName) {
    const routeNames = navigation?.getState?.()?.routeNames || [];
    return routeNames.includes(routeName);
  }

  async function startTrial() {
    setLoading(true);
    setError("");
    track("trial_start_clicked", { step: STEPS.TRIAL_START });
    try {
      const idempotencyKey = `trial-start-${Date.now()}`;
      await api.post(
        "/billing/trial/start",
        { planId: "default" },
        { headers: { "Idempotency-Key": idempotencyKey } }
      );
      await updateStep(STEPS.TRIAL_START);
      await refreshSession?.("trial_started");
      track("trial_started", { step: STEPS.TRIAL_START });
      setSuccess(true);
    } catch (e) {
      track("trial_start_failed", {
        step: STEPS.TRIAL_START,
        error: e?.response?.data?.message || e?.message || "unknown",
      });
      setError(e?.response?.data?.message || "Failed to start trial");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <OnboardingHeader />
      <OnboardingHero
        stepLabel="Step 8 of 9"
        title="Start Your Free Trial"
        subtitle="Full access for 14 days. Cancel anytime."
      />
      <AppBadge label="14 DAY TRIAL" tone="success" style={styles.badge} />

      <AppCard style={styles.disclosure}>
        <AppText style={styles.disclosureTitle}>Trial disclosure</AppText>
        <AppText variant="body" style={styles.disclosureText}>You won’t be charged until your trial ends.</AppText>
        <AppText variant="body" style={styles.disclosureText}>Renewal amount/date are shown before checkout.</AppText>
      </AppCard>

      {!!success ? <AppText style={styles.success}>Trial started successfully.</AppText> : null}
      {!!error ? <AppText style={styles.error}>{error}</AppText> : null}

      <AppButton
        label={loading ? "Starting..." : "Start Free Trial"}
        onPress={startTrial}
        disabled={loading}
        variant="primary"
        style={styles.button}
      />

      <AppButton
        label="Continue"
        variant="secondary"
        style={styles.secondaryBtn}
        onPress={() => {
          if (canNavigateTo("GoLiveChecklist")) {
            navigation.navigate("GoLiveChecklist");
          }
        }}
      />

      {!!error ? (
        <AppButton label="Try Again" variant="secondary" style={styles.retryBtn} onPress={startTrial} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  badge: { marginBottom: spacing.md },
  disclosure: { borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  disclosureTitle: { fontWeight: "800", marginBottom: spacing.xs },
  disclosureText: { color: colors.textSecondary, marginBottom: 3 },
  button: {
    marginTop: 4,
  },
  secondaryBtn: { marginTop: spacing.sm },
  retryBtn: { marginTop: spacing.sm },
  success: { color: colors.success, fontWeight: "700", marginBottom: spacing.sm },
  error: { color: colors.danger, fontWeight: "700", marginBottom: spacing.sm },
});
