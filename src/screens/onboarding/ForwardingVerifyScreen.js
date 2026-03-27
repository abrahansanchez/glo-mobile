import React, { useContext, useEffect, useRef, useState } from "react";
import { AppState, ScrollView, StyleSheet } from "react-native";
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
  const raw =
    payload?.forwardingStatus ||
    payload?.status ||
    payload?.forwarding?.status ||
    payload?.data?.forwardingStatus ||
    payload?.data?.status ||
    payload?.data?.forwarding?.status;

  const normalized = String(raw || "").toLowerCase();

  console.log("[FORWARDING_STATUS_RESOLVED]", {
    raw,
    normalized,
    payload: JSON.stringify(payload),
  });

  return normalized;
}

function isVerificationInProgress(status) {
  return ["routing_ready", "activation_started", "verification_pending", "testing", "verifying"].includes(
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
  const { setLocalStep, onboardingData, navigateFromBackend, updateStep } = useContext(OnboardingContext);
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState("");
  const [statusPayload, setStatusPayload] = useState(null);
  const pollRef = useRef(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    setLocalStep(STEPS.FORWARDING_VERIFICATION);
    console.log("[FORWARDING_VERIFY] screen mounted");
    loadStatus();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      console.log("[FORWARDING_VERIFY] app state:", state);

      if (state === "active") {
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;
        console.log("[FORWARDING_VERIFY] app returned → starting verification");
        runVerification();
      }
    });

    return () => subscription.remove();
  }, []);

  async function loadStatus() {
    console.log("[FORWARDING_VERIFY] loadStatus called");
    try {
      const response = await api.get("/phone/forwarding/status");
      const payload = response.data || {};
      console.log("[FORWARDING_STATUS] payload:", JSON.stringify(payload));
      const status = getForwardingStatus(payload);
      const verified = payload?.verified === true || ["verified", "complete", "completed"].includes(status);

      setStatusPayload(payload);

      if (verified) {
        stopPolling();
        console.log("[FORWARDING_VERIFY] verified — posting step and advancing");
        try {
          await updateStep(STEPS.FORWARDING_VERIFICATION);
        } catch (e) {
          console.log("[FORWARDING_VERIFY] step post failed:", e?.message);
        }
        await navigateFromBackend(navigation);
        return payload;
      }

      if (status === "activation_failed") {
        stopPolling();
        setPolling(false);
        return payload;
      }

      if (isVerificationInProgress(status) && !pollRef.current) {
        startPolling();
      }

      return payload;
    } catch (e) {
      console.log("[FORWARDING_VERIFY] loadStatus error:", e?.message);
      setError(e?.response?.data?.message || "Failed to check forwarding status");
      stopPolling();
      setPolling(false);
      return null;
    }
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling() {
    if (pollRef.current) return;

    console.log("[FORWARDING_VERIFY] starting polling");
    setPolling(true);
    pollRef.current = setInterval(() => {
      loadStatus();
    }, 2000);
  }

  async function runVerification() {
    console.log("[FORWARDING_VERIFY] runVerification called");
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const forwardFromNumber = formatE164(barber?.phoneNumber || onboardingData?.phoneNumber);
      if (!forwardFromNumber) {
        setError("We couldn't find your business number. Go back and confirm your phone number first.");
        setSubmitting(false);
        return;
      }
      const response = await api.post("/phone/forwarding/test", {
        forwardFromNumber,
      });
      console.log("[FORWARDING_VERIFY] test response:", JSON.stringify(response?.data));
      await loadStatus();
    } catch (e) {
      const code = e?.response?.data?.code;
      if (e?.response?.status === 409 || code === "VERIFICATION_ALREADY_RUNNING") {
        console.log("[FORWARDING_VERIFY] already running, switching to polling");
        await loadStatus();
        startPolling();
      } else {
        console.log("[FORWARDING_VERIFY] error:", e?.response?.data || e?.message);
        setError(e?.response?.data?.message || "Failed to start verification");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const status = getForwardingStatus(statusPayload);
  const failed = status === "activation_failed";
  const waiting = polling || submitting || isVerificationInProgress(status);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <OnboardingHeader />
      <OnboardingHero
        stepLabel="Step 7 of 10"
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

      <AppButton
        label="Skip for now — set up later"
        variant="secondary"
        onPress={async () => {
          stopPolling();
          try {
            await updateStep(STEPS.FORWARDING_VERIFICATION);
          } catch (e) {}
          await navigateFromBackend(navigation);
        }}
        style={[styles.secondaryButton, { marginTop: spacing.lg }]}
      />
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
