import React, { useContext, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import api from "../../config/api";
import OnboardingHeader from "../../onboarding/OnboardingHeader";
import { STEPS } from "../../onboarding/stepKeys";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import AppText from "../../components/ui/AppText";
import OnboardingHero from "../../components/onboarding/OnboardingHero";
import { spacing } from "../../ui/tokens";
import { useTheme } from "../../theme/ThemeContext";
import { getStrings, normalizeLanguage } from "../../utils/i18n";

function normalizeChecklist(statusPayload) {
  const payload = statusPayload || {};
  const numberStrategy = String(payload?.numberStrategy || "").toLowerCase();
  const subscriptionStatus = String(payload?.subscriptionStatus || "").toLowerCase();
  const stepMap = payload?.stepMap || {};

  const trialActive =
    subscriptionStatus === "trialing" || subscriptionStatus === "active";

  const numberAssigned =
    numberStrategy === "new_number"
      ? Boolean(payload?.twilioNumber || payload?.assignedTwilioNumber || stepMap?.trial_start)
      : true;

  const forwardingVerified =
    numberStrategy !== "forward_existing" ||
    String(payload?.forwardingStatus || "").toLowerCase() === "verified";

  return [
    { key: "trial_active", label: "Trial active", passed: trialActive, required: true },
    { key: "number_assigned", label: "Number assigned", passed: numberAssigned, required: true },
    { key: "forwarding_verified", label: "Forwarding verified", passed: forwardingVerified, required: numberStrategy === "forward_existing" },
  ];
}

export default function GoLiveChecklistScreen({ navigation }) {
  const { colors } = useTheme();
  const { setLocalStep, updateStep, navigateFromBackend, onboardingData } = useContext(OnboardingContext);
  const t = getStrings(normalizeLanguage(onboardingData?.preferredLanguage));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusPayload, setStatusPayload] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setLocalStep(STEPS.GO_LIVE_CHECKLIST);
  }, [setLocalStep]);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/onboarding/status");
      setStatusPayload(response?.data || {});
    } catch (requestError) {
      setError(requestError?.response?.data?.message || t.failedToSave);
      setStatusPayload(null);
    } finally {
      setLoading(false);
    }
  }

  const checklistItems = useMemo(() => normalizeChecklist(statusPayload), [statusPayload]);
  const allItemsPass = checklistItems.every((item) => item.passed);

  async function handleGoLive() {
    if (!allItemsPass || submitting) return;

    setSubmitting(true);
    setError("");
    try {
      await updateStep(STEPS.GO_LIVE_CHECKLIST);
      await navigateFromBackend(navigation);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || t.failedToSave);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <OnboardingHeader />
      <OnboardingHero
        stepLabel="Step 10 of 10"
        title={t.checklistTitle}
        subtitle={t.checklistSubtitle}
      />

      {loading ? <AppText style={[styles.helperText, { color: colors.textSecondary }]}>{t.loadingChecklist}</AppText> : null}

      {checklistItems.map((item) => (
        <AppCard key={item.key} style={[styles.row, { borderColor: colors.border }]}>
          <View style={styles.rowText}>
            <AppText style={styles.rowLabel}>
              {item.key === "trial_active"
                ? t.checklistTrialLabel
                : item.key === "number_assigned"
                ? t.checklistNumberLabel
                : t.checklistForwardingLabel}
            </AppText>
            <AppText style={[styles.rowHelper, { color: colors.textSecondary }]}>
              {item.required ? t.requiredForLaunch : t.notRequiredForPath}
            </AppText>
          </View>
          <AppText style={[styles.rowStatus, { color: item.passed ? colors.success : colors.warning }]}>
            {item.passed ? t.statusReady : t.statusPending}
          </AppText>
        </AppCard>
      ))}

      {!!error ? <AppText style={[styles.errorText, { color: colors.danger }]}>{error}</AppText> : null}

      {allItemsPass ? (
        <AppButton
          label={submitting ? t.goingLive : t.checklistGoLive}
          onPress={handleGoLive}
          disabled={submitting}
          variant="primary"
          style={styles.button}
        />
      ) : (
        <AppButton
          label={loading ? t.loadingChecklist : t.checklistRefresh}
          onPress={loadStatus}
          disabled={loading}
          variant="secondary"
          style={styles.button}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
  },
  helperText: {
    marginBottom: spacing.md,
    fontWeight: "700",
  },
  row: {
    borderWidth: 1,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  rowText: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  rowLabel: {
    fontWeight: "800",
  },
  rowHelper: {
    marginTop: 2,
  },
  rowStatus: {
    fontWeight: "800",
  },
  errorText: {
    marginTop: spacing.sm,
    fontWeight: "700",
  },
  button: {
    marginTop: spacing.md,
  },
});
