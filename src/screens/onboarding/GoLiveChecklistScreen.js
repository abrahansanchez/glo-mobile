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

function getStringValue(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function getBooleanValue(...values) {
  for (const value of values) {
    if (typeof value === "boolean") return value;
  }
  return false;
}

function normalizeChecklist(statusPayload) {
  const payload = statusPayload || {};
  const numberStrategy = getStringValue(
    payload?.numberStrategy,
    payload?.phoneStrategy,
    payload?.phone?.strategy,
    payload?.phoneSetup?.strategy
  ).toLowerCase();

  const trialActive = getBooleanValue(
    payload?.trialActive,
    payload?.trial?.active,
    payload?.billing?.trialActive,
    payload?.stepMap?.trial_start?.completed
  );

  const numberAssigned = getBooleanValue(
    payload?.numberAssigned,
    payload?.phone?.assigned,
    payload?.phoneSetup?.numberAssigned,
    payload?.stepMap?.number_strategy?.completed
  );

  const forwardingVerified = numberStrategy !== "forward_existing" || getBooleanValue(
    payload?.forwardingVerified,
    payload?.forwarding?.verified,
    payload?.phoneSetup?.forwardingVerified,
    payload?.stepMap?.forwarding_verification?.completed
  );

  const portingSubmitted = numberStrategy !== "port_existing" || getBooleanValue(
    payload?.portingSubmitted,
    payload?.porting?.submitted,
    payload?.phoneSetup?.portingSubmitted,
    payload?.stepMap?.porting_flow?.completed
  );

  return [
    {
      key: "trial_active",
      label: "Trial active",
      passed: trialActive,
      required: true,
    },
    {
      key: "number_assigned",
      label: "Number assigned",
      passed: numberAssigned,
      required: true,
    },
    {
      key: "forwarding_verified",
      label: "Forwarding verified",
      passed: forwardingVerified,
      required: numberStrategy === "forward_existing",
    },
    {
      key: "porting_submitted",
      label: "Porting submitted",
      passed: portingSubmitted,
      required: numberStrategy === "port_existing",
    },
  ];
}

export default function GoLiveChecklistScreen() {
  const { colors } = useTheme();
  const { setLocalStep, updateStep, refreshOnboardingStatus } = useContext(OnboardingContext);
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
      setError(requestError?.response?.data?.message || "Failed to load onboarding checklist");
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
      await refreshOnboardingStatus();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to finish onboarding");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <OnboardingHeader />
      <OnboardingHero
        stepLabel="Step 10 of 10"
        title="Go live checklist"
        subtitle="This final step confirms your account is ready before we open the dashboard."
      />

      {loading ? <AppText style={[styles.helperText, { color: colors.textSecondary }]}>Loading checklist…</AppText> : null}

      {checklistItems.map((item) => (
        <AppCard key={item.key} style={[styles.row, { borderColor: colors.border }]}>
          <View style={styles.rowText}>
            <AppText style={styles.rowLabel}>{item.label}</AppText>
            <AppText style={[styles.rowHelper, { color: colors.textSecondary }]}>
              {item.required ? "Required for launch" : "Not required for your selected path"}
            </AppText>
          </View>
          <AppText style={[styles.rowStatus, { color: item.passed ? colors.success : colors.warning }]}>
            {item.passed ? "Ready" : "Pending"}
          </AppText>
        </AppCard>
      ))}

      {!!error ? <AppText style={[styles.errorText, { color: colors.danger }]}>{error}</AppText> : null}

      {allItemsPass ? (
        <AppButton
          label={submitting ? "Going live..." : "Go Live"}
          onPress={handleGoLive}
          disabled={submitting}
          variant="primary"
          style={styles.button}
        />
      ) : (
        <AppButton
          label={loading ? "Refreshing..." : "Refresh checklist"}
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
