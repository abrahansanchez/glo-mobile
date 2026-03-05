import React, { useContext, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import { AuthContext } from "../../auth/authContext";
import api from "../../config/api";
import OnboardingHeader from "../../onboarding/OnboardingHeader";
import { STEPS } from "../../onboarding/stepKeys";
import AppCard from "../../components/ui/AppCard";
import AppText from "../../components/ui/AppText";
import AppBadge from "../../components/ui/AppBadge";
import { colors, spacing } from "../../ui/tokens";

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
    try {
      const idempotencyKey = `trial-start-${Date.now()}`;
      await api.post(
        "/billing/trial/start",
        { planId: "default" },
        { headers: { "Idempotency-Key": idempotencyKey } }
      );
      await updateStep(STEPS.TRIAL_START);
      await refreshSession?.("trial_started");
      setSuccess(true);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to start trial");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <OnboardingHeader />
      <AppText variant="title" style={styles.title}>Start Your Free Trial</AppText>
      <AppText variant="body" style={styles.subtitle}>Full access for 14 days. Cancel anytime.</AppText>
      <AppBadge label="14 DAY TRIAL" tone="success" style={styles.badge} />

      <AppCard style={styles.disclosure}>
        <AppText style={styles.disclosureTitle}>Trial disclosure</AppText>
        <AppText variant="body" style={styles.disclosureText}>You won’t be charged until your trial ends.</AppText>
        <AppText variant="body" style={styles.disclosureText}>Renewal amount/date are shown before checkout.</AppText>
      </AppCard>

      {!!success ? <AppText style={styles.success}>Trial started successfully.</AppText> : null}
      {!!error ? <AppText style={styles.error}>{error}</AppText> : null}

      <Pressable style={[styles.button, loading && styles.buttonDisabled]} disabled={loading} onPress={startTrial}>
        <AppText style={styles.buttonText}>{loading ? "Starting..." : "Start Free Trial"}</AppText>
      </Pressable>

      <Pressable
        style={styles.secondaryBtn}
        onPress={() => {
          if (canNavigateTo("GoLiveChecklist")) {
            navigation.navigate("GoLiveChecklist");
          }
        }}
      >
        <AppText style={styles.secondaryText}>Continue</AppText>
      </Pressable>

      {!!error ? (
        <Pressable style={styles.retryBtn} onPress={startTrial}>
          <AppText style={styles.retryText}>Retry</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { marginBottom: spacing.xs },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.md },
  badge: { marginBottom: spacing.md },
  disclosure: { borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  disclosureTitle: { fontWeight: "800", marginBottom: spacing.xs },
  disclosureText: { color: colors.textSecondary, marginBottom: 3 },
  button: {
    backgroundColor: "#000",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontWeight: "900" },
  secondaryBtn: { marginTop: 10, alignItems: "center", padding: 10 },
  secondaryText: { color: colors.textPrimary, fontWeight: "700", textDecorationLine: "underline" },
  retryBtn: { marginTop: 8, alignItems: "center" },
  retryText: { color: colors.textPrimary, fontWeight: "800" },
  success: { color: colors.success, fontWeight: "700", marginBottom: spacing.sm },
  error: { color: colors.danger, fontWeight: "700", marginBottom: spacing.sm },
});
