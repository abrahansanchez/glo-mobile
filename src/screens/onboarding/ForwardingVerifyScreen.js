import React, { useContext, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { AuthContext } from "../../auth/authContext";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import api from "../../config/api";
import OnboardingHeader from "../../onboarding/OnboardingHeader";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import AppText from "../../components/ui/AppText";
import OnboardingHero from "../../components/onboarding/OnboardingHero";
import { STEPS } from "../../onboarding/stepKeys";
import { spacing } from "../../ui/tokens";
import { useTheme } from "../../theme/ThemeContext";

function getForwardingStatus(payload) {
  return String(
    payload?.forwardingStatus ||
      payload?.status ||
      payload?.forwarding?.status ||
      ""
  ).toLowerCase();
}

function isVerificationInProgress(status) {
  return ["pending_verification", "verification_started", "testing", "verifying"].includes(
    String(status || "").toLowerCase()
  );
}

function formatE164(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return "";
}

export default function ForwardingVerifyScreen({ navigation }) {
  const { colors, resolvedTheme } = useTheme();
  const { barber } = useContext(AuthContext);
  const { setLocalStep, onboardingData } = useContext(OnboardingContext);
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState("");
  const [statusPayload, setStatusPayload] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    setLocalStep(STEPS.FORWARDING_VERIFICATION);
    loadStatus();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [setLocalStep]);

  async function loadStatus() {
    try {
      const response = await api.get("/phone/forwarding/status");
      const payload = response.data || {};
      setStatusPayload(payload);
      const status = getForwardingStatus(payload);
      if (["verified", "complete", "completed"].includes(status)) {
        stopPolling();
        navigation.replace("ForwardingSuccess");
      } else if (status === "failed") {
        stopPolling();
        setPolling(false);
      } else if (isVerificationInProgress(status) && !pollRef.current) {
        startPolling();
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to check forwarding status");
      stopPolling();
      setPolling(false);
    }
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling() {
    stopPolling();
    setPolling(true);
    pollRef.current = setInterval(() => {
      loadStatus();
    }, 3000);
  }

  async function runVerification() {
    setSubmitting(true);
    setError("");
    try {
      const forwardFromNumber = formatE164(barber?.phoneNumber || onboardingData?.phoneNumber);
      if (!forwardFromNumber) {
        setError("We couldn't find your business number. Go back and confirm your phone number first.");
        setSubmitting(false);
        return;
      }

      await api.post("/phone/forwarding/test", {
        forwardFromNumber,
      });
      await loadStatus();
      startPolling();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to start verification");
    } finally {
      setSubmitting(false);
    }
  }

  const status = getForwardingStatus(statusPayload);
  const failed = status === "failed";
  const waiting = polling || submitting || isVerificationInProgress(status);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <OnboardingHeader />
      <OnboardingHero
        stepLabel="Step 6 of 9"
        title="Verify forwarding"
        subtitle="We’ll run a quick test to confirm your calls are reaching Glō."
      />

      <AppCard style={styles.statusCard}>
        {waiting ? (
          <>
            <AppText style={styles.statusTitle}>Calling your number...</AppText>
            <AppText style={[styles.statusText, { color: colors.textSecondary }]}>Verifying forwarding...</AppText>
          </>
        ) : failed ? (
          <>
            <AppText style={[styles.statusTitle, { color: colors.danger }]}>We couldn't verify forwarding yet.</AppText>
            <AppText style={[styles.statusText, { color: colors.textSecondary }]}>
              Please confirm forwarding is active and try again.
            </AppText>
          </>
        ) : (
          <>
            <AppText style={styles.statusTitle}>Ready to test</AppText>
            <AppText style={[styles.statusText, { color: colors.textSecondary }]}>
              We’ll place a quick verification call and confirm it reaches Glō.
            </AppText>
          </>
        )}
      </AppCard>

      {failed ? (
        <AppCard style={[styles.failedCard, { borderColor: colors.warning, backgroundColor: resolvedTheme === "dark" ? "#3a2a14" : "#fffbeb" }]}>
          <AppText style={[styles.failedTitle, { color: colors.warning }]}>Need another pass?</AppText>
          <AppText style={[styles.failedText, { color: colors.warning }]}>
            Re-run the test after you confirm forwarding is active with your carrier.
          </AppText>
        </AppCard>
      ) : null}

      {!!error ? <AppText style={[styles.error, { color: colors.danger }]}>{error}</AppText> : null}

      {!waiting ? (
        <AppButton
          label={failed ? "Try again" : "Run test call"}
          onPress={runVerification}
          disabled={submitting}
          style={styles.primaryButton}
        />
      ) : null}

      {!waiting && failed ? (
        <AppButton
          label="Back to setup"
          variant="secondary"
          onPress={() => navigation.navigate("ForwardingSetup")}
          disabled={submitting}
          style={styles.secondaryButton}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    justifyContent: "center",
  },
  statusCard: {
    marginBottom: spacing.md,
  },
  statusTitle: {
    fontWeight: "900",
    fontSize: 22,
    marginBottom: spacing.xs,
  },
  statusText: {
    fontSize: 14,
  },
  failedCard: {
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  failedTitle: {
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  failedText: {
    fontWeight: "600",
  },
  primaryButton: {
    marginTop: spacing.xs,
  },
  secondaryButton: {
    marginTop: spacing.sm,
  },
  error: {
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
});
