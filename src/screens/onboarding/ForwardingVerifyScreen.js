import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
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

const SUPPORTED_STATES = new Set([
  "provisioning",
  "provisioning_failed_retryable",
  "provisioning_failed_terminal",
  "awaiting_forwarding_setup",
  "verification_in_progress",
  "verification_failed_retryable",
  "verified",
]);

export function formatE164(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return "";
}

export function getVerificationCode(payload) {
  const value = payload?.verificationCode ?? payload?.data?.verificationCode;
  return typeof value === "string" && /^\d{6}$/.test(value) ? value : "";
}

export function getServerState(payload) {
  if (payload?.verified === true) return "verified";

  for (const state of [
    payload?.phoneSetupState,
    payload?.forwardingStatus,
    payload?.provisioningStatus,
  ]) {
    const normalized = String(state || "").toLowerCase();
    if (SUPPORTED_STATES.has(normalized)) return normalized;
  }

  const provisioningStatus = String(payload?.provisioningStatus || "").toLowerCase();
  const failureClass = String(payload?.provisioningFailureClass || "").toLowerCase();
  if (provisioningStatus === "failed" && failureClass === "retryable") {
    return "provisioning_failed_retryable";
  }
  if (provisioningStatus === "failed" && failureClass === "terminal") {
    return "provisioning_failed_terminal";
  }
  return "";
}

export function sessionFromTestResponse(payload, forwardFromNumber) {
  const body = payload?.data || payload || {};
  return {
    verificationCode: getVerificationCode(payload),
    verificationSessionId:
      typeof body.verificationSessionId === "string" ? body.verificationSessionId : "",
    verificationWindowExpiresAt:
      typeof body.verificationWindowExpiresAt === "string" ? body.verificationWindowExpiresAt : "",
    instructions: typeof body.instructions === "string" ? body.instructions : "",
    forwardFromNumber,
  };
}

export function mergePendingStatus(currentSession, payload, forwardFromNumber) {
  return {
    verificationCode: currentSession?.verificationCode || "",
    verificationSessionId:
      typeof payload?.verificationSessionId === "string"
        ? payload.verificationSessionId
        : currentSession?.verificationSessionId || "",
    verificationWindowExpiresAt:
      typeof payload?.verificationWindowExpiresAt === "string"
        ? payload.verificationWindowExpiresAt
        : currentSession?.verificationWindowExpiresAt || "",
    instructions: currentSession?.instructions || "",
    forwardFromNumber: currentSession?.forwardFromNumber || forwardFromNumber,
  };
}

export function reconcileStatusSession(currentSession, payload, forwardFromNumber) {
  const state = getServerState(payload);
  if (state === "verified") return null;
  if (state === "verification_in_progress") {
    return mergePendingStatus(currentSession, payload, forwardFromNumber);
  }
  return currentSession;
}

export function requiresCodeRecovery(state, session) {
  return (
    state === "verification_in_progress" &&
    Boolean(session?.verificationSessionId) &&
    !session?.verificationCode
  );
}

export function buildRestartPayload(session) {
  if (!session?.verificationSessionId) return null;
  return {
    forwardFromNumber: session.forwardFromNumber,
    restartVerification: true,
    expectedVerificationSessionId: session.verificationSessionId,
  };
}

function isExpired(value) {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}

export default function ForwardingVerifyScreen({ navigation }) {
  const { colors, resolvedTheme } = useTheme();
  const { setLocalStep, onboardingData, updateStep } = useContext(OnboardingContext);
  const [starting, setStarting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState("");
  const [statusPayload, setStatusPayload] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const operationInFlightRef = useRef("");

  const normalizedForwardFromNumber = useMemo(
    () => formatE164(onboardingData?.forwardFromNumber || onboardingData?.phoneNumber),
    [onboardingData?.forwardFromNumber, onboardingData?.phoneNumber]
  );
  const serverState = getServerState(statusPayload);
  const verified = serverState === "verified";
  const pending = serverState === "verification_in_progress";
  const expired = isExpired(
    activeSession?.verificationWindowExpiresAt || statusPayload?.verificationWindowExpiresAt
  );
  const retryableFailure = [
    "provisioning_failed_retryable",
    "verification_failed_retryable",
  ].includes(serverState);
  const terminalFailure = serverState === "provisioning_failed_terminal";
  const activeSessionId =
    activeSession?.verificationSessionId ||
    (typeof statusPayload?.verificationSessionId === "string"
      ? statusPayload.verificationSessionId
      : "");
  const codeUnavailable = requiresCodeRecovery(serverState, {
    ...activeSession,
    verificationSessionId: activeSessionId,
  });
  const canRestart = Boolean(activeSessionId) && (pending || expired || retryableFailure);

  useEffect(() => {
    setLocalStep(STEPS.FORWARDING_VERIFICATION);
  }, [setLocalStep]);

  function applyStatus(payload) {
    const nextPayload = payload || {};
    setStatusPayload(nextPayload);

    setActiveSession((current) =>
      reconcileStatusSession(current, nextPayload, normalizedForwardFromNumber)
    );
  }

  async function refreshStatus() {
    if (operationInFlightRef.current) return;
    operationInFlightRef.current = "refresh";
    setRefreshing(true);
    setError("");
    try {
      const response = await api.get("/phone/forwarding/status");
      applyStatus(response.data || {});
    } catch {
      setError("Failed to check verification status. Please try again.");
    } finally {
      operationInFlightRef.current = "";
      setRefreshing(false);
    }
  }

  async function startVerification() {
    if (operationInFlightRef.current) return;
    if (!normalizedForwardFromNumber) {
      setError("We couldn't find your business number. Go back and confirm it first.");
      return;
    }

    operationInFlightRef.current = "start";
    setStarting(true);
    setError("");
    try {
      const response = await api.post("/phone/forwarding/test", {
        forwardFromNumber: normalizedForwardFromNumber,
      });
      const nextSession = sessionFromTestResponse(response.data, normalizedForwardFromNumber);
      if (!nextSession.verificationCode || !nextSession.verificationSessionId) {
        throw new Error("Verification started without a displayable code or session.");
      }
      setActiveSession(nextSession);
      setStatusPayload(response.data?.data || response.data || {});
    } catch (requestError) {
      const responseBody = requestError?.response?.data;
      if (responseBody?.code === "VERIFICATION_ALREADY_RUNNING") {
        applyStatus({
          phoneSetupState: "verification_in_progress",
          verificationSessionId: responseBody?.verificationSessionId,
          verificationWindowExpiresAt: responseBody?.verificationWindowExpiresAt,
        });
        setError(
          "Verification is already in progress, but this code can’t be shown again. Restart verification to generate a new code."
        );
      } else {
        setError("Failed to start verification. Please try again.");
      }
    } finally {
      operationInFlightRef.current = "";
      setStarting(false);
    }
  }

  async function restartVerification() {
    if (operationInFlightRef.current) return;
    const restartPayload = buildRestartPayload({
      ...activeSession,
      verificationSessionId: activeSessionId,
      forwardFromNumber:
        activeSession?.forwardFromNumber || normalizedForwardFromNumber,
    });
    if (!restartPayload?.expectedVerificationSessionId) {
      setError("Check verification status before restarting.");
      return;
    }
    if (!formatE164(restartPayload.forwardFromNumber)) {
      setError("We couldn't find your business number. Go back and confirm it first.");
      return;
    }

    operationInFlightRef.current = "restart";
    setRestarting(true);
    setError("");
    try {
      const response = await api.post("/phone/forwarding/test", restartPayload);
      const nextSession = sessionFromTestResponse(
        response.data,
        restartPayload.forwardFromNumber
      );
      if (!nextSession.verificationCode || !nextSession.verificationSessionId) {
        throw new Error("Verification restarted without a displayable code or session.");
      }
      setActiveSession(nextSession);
      setStatusPayload(response.data?.data || response.data || {});
    } catch {
      setError("Could not restart verification. Check the current status and try again.");
    } finally {
      operationInFlightRef.current = "";
      setRestarting(false);
    }
  }

  async function continueOnboarding() {
    try {
      await updateStep("ai_intro");
    } catch (stepError) {
      setError(stepError?.message || "Failed to continue onboarding.");
      return;
    }
    navigation.replace("AIIntro");
  }

  const busy = starting || refreshing || restarting;
  const instructions =
    activeSession?.instructions ||
    "When the test call connects, enter these six digits using the phone keypad.";

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <OnboardingHeader />
      <OnboardingHero
        stepLabel="Step 7 of 10"
        title="Verify forwarding"
        subtitle="Run a secure test call, enter the six-digit code, then check the result."
      />

      <AppCard style={styles.statusCard}>
        <AppText style={styles.statusTitle}>
          {verified
            ? "Forwarding verified"
            : pending
            ? "Verification in progress"
            : terminalFailure
            ? "Forwarding setup needs support"
            : retryableFailure || expired
            ? "Verification needs another try"
            : serverState === "provisioning"
            ? "Preparing your routing line"
            : serverState === "awaiting_forwarding_setup"
            ? "Ready for forwarding setup"
            : "Ready to test"}
        </AppText>
        <AppText style={[styles.statusText, { color: colors.textSecondary }]}>
          {verified
            ? "Your calls are reaching Glō."
            : terminalFailure
            ? "Glō couldn't provision this routing line automatically. Contact support before retrying."
            : pending
            ? "Complete the test call, then check verification status."
            : "Start a test when call forwarding is active."}
        </AppText>
      </AppCard>

      {activeSession?.verificationCode ? (
        <AppCard
          style={[
            styles.codeCard,
            { borderColor: colors.accentBorder, backgroundColor: colors.surface },
          ]}
        >
          <AppText style={[styles.codeLabel, { color: colors.textSecondary }]}>
            Your verification code
          </AppText>
          <AppText
            accessibilityLabel={`Verification code ${activeSession.verificationCode
              .split("")
              .join(" ")}`}
            style={styles.codeValue}
          >
            {activeSession.verificationCode}
          </AppText>
          <AppText style={[styles.codeHelp, { color: colors.textSecondary }]}>
            {instructions}
          </AppText>
        </AppCard>
      ) : null}

      {codeUnavailable ? (
        <AppCard
          style={[
            styles.recoveryCard,
            {
              borderColor: colors.warning,
              backgroundColor: resolvedTheme === "dark" ? "#3a2a14" : "#fffbeb",
            },
          ]}
        >
          <AppText style={[styles.recoveryText, { color: colors.warning }]}>
            Verification is already in progress, but this code can’t be shown again. Restart verification to generate a new code.
          </AppText>
        </AppCard>
      ) : null}

      {!!error ? <AppText style={[styles.error, { color: colors.danger }]}>{error}</AppText> : null}

      {!activeSessionId && !verified ? (
        <AppButton
          label={starting ? "Starting verification..." : "Start verification call"}
          onPress={startVerification}
          disabled={busy}
          style={styles.primaryButton}
        />
      ) : null}

      <AppButton
        label={refreshing ? "Checking status..." : "Check verification status"}
        variant={verified ? "secondary" : "primary"}
        onPress={refreshStatus}
        disabled={busy}
        style={styles.secondaryButton}
      />

      {canRestart ? (
        <AppButton
          label={restarting ? "Restarting verification..." : "Restart verification"}
          variant="secondary"
          onPress={restartVerification}
          disabled={busy}
          style={styles.secondaryButton}
        />
      ) : null}

      {verified ? (
        <AppButton
          label="Continue"
          onPress={continueOnboarding}
          disabled={busy}
          style={styles.primaryButton}
        />
      ) : null}

      {!verified ? (
        <AppButton
          label="Back to setup"
          variant="secondary"
          onPress={() => navigation.navigate("ForwardingSetup")}
          disabled={busy}
          style={styles.secondaryButton}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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
    lineHeight: 20,
  },
  codeCard: {
    alignItems: "center",
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  codeLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  codeValue: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 6,
    marginBottom: spacing.sm,
  },
  codeHelp: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  recoveryCard: {
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  recoveryText: {
    fontWeight: "700",
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: spacing.sm,
  },
  secondaryButton: {
    marginTop: spacing.sm,
  },
  error: {
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
});
