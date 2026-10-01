import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
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
import { getStrings, normalizeLanguage } from "../../utils/i18n";
import {
  buildCarrierActivationCode,
  beginExclusiveOperation,
  endExclusiveOperation,
  getForwardingSetupControls,
  normalizeE164,
  parseForwardingResponse,
} from "../../phone/forwardingContract";

const CARRIER_OPTIONS = ["Verizon", "AT&T", "T-Mobile", "Other"];

function normalizeDigits(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function formatPhoneNumber(value) {
  const digits = normalizeDigits(value);
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (local.length !== 10) return value || "—";
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}

function getNextRouteFromStatus(normalized) {
  if (normalized === "verified") return "ForwardingSuccess";
  if (["verification_in_progress", "verification_failed_retryable"].includes(normalized)) {
    return "ForwardingVerify";
  }
  return null;
}

export default function ForwardingSetupScreen({ navigation }) {
  const { colors, resolvedTheme } = useTheme();
  const {
    onboardingData,
    updateData,
    setLocalStep,
    updateStep,
    navigateFromBackend,
    authenticatedForwardingStatus,
    replaceAuthenticatedForwardingStatus,
  } = useContext(OnboardingContext);
  const t = getStrings(normalizeLanguage(onboardingData?.preferredLanguage));
  const [carrier, setCarrier] = useState(onboardingData?.forwardingCarrier || "Verizon");
  const [forwardNumber, setForwardNumber] = useState(
    onboardingData?.forwardFromNumber || onboardingData?.phoneNumber || ""
  );
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState("");
  const hasNavigatedRef = useRef(false);
  const operationInFlightRef = useRef("");

  const forwardToNumber = authenticatedForwardingStatus?.forwardToNumber || "";
  const activationCodePreview = useMemo(
    () => buildCarrierActivationCode(carrier, forwardToNumber),
    [carrier, forwardToNumber]
  );
  const controls = getForwardingSetupControls(authenticatedForwardingStatus);
  const {
    destinationReady,
    provisioningPending,
    provisioningRetryable,
    provisioningTerminal,
  } = controls;

  useEffect(() => {
    setLocalStep(STEPS.FORWARDING_SETUP);
  }, [setLocalStep]);

  useEffect(() => {
    if (onboardingData?.forwardingCarrier) {
      setCarrier(onboardingData.forwardingCarrier);
    }
  }, [onboardingData?.forwardingCarrier]);

  useEffect(() => {
    const savedForwardFrom =
      onboardingData?.forwardFromNumber || onboardingData?.phoneNumber;
    if (savedForwardFrom) {
      setForwardNumber(savedForwardFrom);
    }
  }, [onboardingData?.forwardFromNumber, onboardingData?.phoneNumber]);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    if (!beginExclusiveOperation(operationInFlightRef, "status")) return;
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/phone/forwarding/status");
      const payload = parseForwardingResponse(response);
      replaceAuthenticatedForwardingStatus(payload);
      const savedFromNumber = payload.forwardFromNumber;
      if (savedFromNumber) setForwardNumber(savedFromNumber);
      await updateData({
        forwardFromNumber: savedFromNumber || normalizeE164(forwardNumber),
        forwardingCarrier: payload.forwardingCarrier || carrier,
      });

      const nextRoute = getNextRouteFromStatus(payload.phoneSetupState);
      if (
        nextRoute &&
        (payload.phoneSetupState === "verified" || payload.forwardToNumber) &&
        !hasNavigatedRef.current
      ) {
        hasNavigatedRef.current = true;
        await navigateFromBackend(navigation);
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load forwarding details");
    } finally {
      endExclusiveOperation(operationInFlightRef, "status");
      setLoading(false);
    }
  }

  async function retryProvisioning() {
    if (!beginExclusiveOperation(operationInFlightRef, "provisioning")) return;
    const normalizedForwardNumber = normalizeE164(forwardNumber);
    if (!normalizedForwardNumber) {
      endExclusiveOperation(operationInFlightRef, "provisioning");
      setError("Enter a valid business phone number, including the area code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/phone/number-strategy", {
        strategy: "forward_existing",
        forwardFromNumber: normalizedForwardNumber,
        ...(carrier ? { forwardingCarrier: carrier } : {}),
      });
    } catch (e) {
      setError(e?.response?.data?.message || "Could not retry routing-line setup.");
    } finally {
      endExclusiveOperation(operationInFlightRef, "provisioning");
      setLoading(false);
    }
    await loadStatus();
  }

  async function handleCarrierSelect(nextCarrier) {
    setCarrier(nextCarrier);
    await updateData({ forwardingCarrier: nextCarrier });
  }

  async function handleActivate() {
    if (!beginExclusiveOperation(operationInFlightRef, "activation")) return;
    if (!destinationReady || !activationCodePreview) {
      endExclusiveOperation(operationInFlightRef, "activation");
      setError("Forwarding line is still being set up. Please wait a moment and try again.");
      return;
    }

    if (carrier === "Other") {
      endExclusiveOperation(operationInFlightRef, "activation");
      Alert.alert(
        "Carrier-specific setup",
        `Carrier forwarding codes vary. Call your carrier and forward calls to ${formatPhoneNumber(
          forwardToNumber
        )}.`
      );
      return;
    }

    setActivating(true);
    setError("");
    try {
      const normalizedForwardNumber = normalizeE164(forwardNumber);
      if (!normalizedForwardNumber) {
        setError("Enter a valid business phone number, including the area code.");
        return;
      }
      await updateData({
        numberStrategy: "forward_existing",
        forwardFromNumber: normalizedForwardNumber,
        forwardingCarrier: carrier,
      });
      await Linking.openURL(`tel:${encodeURIComponent(activationCodePreview)}`);
      // Navigate to verification screen directly after opening dialer
      if (!hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        navigation.navigate("ForwardingVerification");
      }
    } catch (e) {
      setError(e?.message || "Could not open the dialer");
    } finally {
      endExclusiveOperation(operationInFlightRef, "activation");
      setActivating(false);
    }
  }

  async function handleSkip() {
    if (!destinationReady) {
      setError("Your dedicated Glō routing line must be ready before verification.");
      return;
    }
    setSkipping(true);
    setError("");
    try {
      await updateStep(STEPS.FORWARDING_SETUP);
      await navigateFromBackend(navigation);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to continue onboarding");
    } finally {
      setSkipping(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <OnboardingHeader />
      <OnboardingHero
        stepLabel="Step 6 of 10"
        title={t.forwardingTitle}
        subtitle={t.forwardingSubtitle}
      />

      <AppCard style={styles.numberCard}>
        <View style={styles.numberRow}>
          <AppText style={styles.label}>Your business number</AppText>
          <TextInput
            accessibilityLabel="Business phone number"
            value={forwardNumber}
            onChangeText={setForwardNumber}
            placeholder="(555) 555-0123"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            style={[styles.phoneInput, { borderColor: colors.border, color: colors.textPrimary }]}
          />
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.numberRow}>
          <AppText style={styles.label}>Glō routing line</AppText>
          <AppText style={styles.value}>{formatPhoneNumber(forwardToNumber)}</AppText>
        </View>
      </AppCard>

      <AppText style={styles.sectionTitle}>Choose your carrier</AppText>
      <View style={styles.carrierList}>
        {CARRIER_OPTIONS.map((option) => {
          const selected = option === carrier;
          return (
            <Pressable key={option} onPress={() => handleCarrierSelect(option)} style={styles.carrierPressable}>
              <AppCard
                style={[
                  styles.carrierCard,
                  selected && styles.selectedCard,
                  selected && { borderColor: colors.textPrimary, backgroundColor: resolvedTheme === "dark" ? "#18222f" : "#f8fafc" },
                ]}
              >
                <AppText style={styles.carrierTitle}>{option}</AppText>
                <AppText style={[styles.carrierSubtitle, { color: colors.textSecondary }]}>
                  {selected && activationCodePreview
                    ? `Dial ${activationCodePreview}`
                    : option === "Other"
                    ? "We’ll show the Glō line to forward to."
                    : "We’ll build the carrier activation call for you."}
                </AppText>
              </AppCard>
            </Pressable>
          );
        })}
      </View>

      <AppCard style={styles.stepsCard}>
        <AppText style={styles.stepsTitle}>How it works</AppText>
        <AppText style={[styles.stepText, { color: colors.textSecondary }]}>Step 1  Tap Activate forwarding</AppText>
        <AppText style={[styles.stepText, { color: colors.textSecondary }]}>Step 2  Complete the short call with your carrier</AppText>
        <AppText style={[styles.stepText, { color: colors.textSecondary }]}>Step 3  Return to Glō</AppText>
      </AppCard>

      {carrier === "Other" ? (
        <AppCard style={[styles.helperCard, { borderColor: colors.warning, backgroundColor: resolvedTheme === "dark" ? "#3a2a14" : "#fffbeb" }]}>
          <AppText style={[styles.helperTitle, { color: colors.warning }]}>Carrier varies</AppText>
          <AppText style={[styles.helperText, { color: colors.warning }]}>
            Ask your carrier how to forward calls to {formatPhoneNumber(forwardToNumber)}.
          </AppText>
        </AppCard>
      ) : null}

      {loading && !authenticatedForwardingStatus && (
        <AppText style={[styles.error, { color: colors.textSecondary }]}>
          Setting up your forwarding line...
        </AppText>
      )}
      {provisioningPending ? (
        <AppText style={[styles.error, { color: colors.textSecondary }]}>
          Your dedicated Glō routing line is still being provisioned.
        </AppText>
      ) : null}
      {provisioningRetryable ? (
        <>
          <AppText style={[styles.error, { color: colors.warning }]}>
            Routing-line setup needs another attempt. Retrying is safe and will reuse the same assignment.
          </AppText>
          <AppButton
            label={loading ? "Retrying..." : "Retry routing-line setup"}
            variant="secondary"
            onPress={retryProvisioning}
            disabled={loading || activating}
            style={styles.secondaryButton}
          />
        </>
      ) : null}
      {provisioningTerminal ? (
        <AppText style={[styles.error, { color: colors.danger }]}>
          We couldn’t create your routing line. Contact support before continuing.
        </AppText>
      ) : null}
      {!!error ? <AppText style={[styles.error, { color: colors.danger }]}>{error}</AppText> : null}

      {provisioningPending ? (
        <AppButton
          label={loading ? "Checking..." : "Check routing-line status"}
          variant="secondary"
          onPress={loadStatus}
          disabled={loading || activating}
          style={styles.secondaryButton}
        />
      ) : null}

      <AppButton
        label={activating ? "Opening dialer..." : "Activate forwarding"}
        onPress={handleActivate}
        disabled={
          activating ||
          loading ||
          !normalizeE164(forwardNumber) ||
          !destinationReady ||
          provisioningPending ||
          provisioningRetryable ||
          provisioningTerminal
        }
        style={styles.primaryButton}
      />
      <AppButton
        label={skipping ? "Saving..." : "I’ll do this later"}
        variant="secondary"
        onPress={handleSkip}
        disabled={skipping || loading || !destinationReady}
        style={styles.secondaryButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  numberCard: {
    marginBottom: spacing.md,
  },
  numberRow: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.85,
  },
  value: {
    fontSize: 24,
    fontWeight: "900",
  },
  phoneInput: {
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 20,
    fontWeight: "800",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  sectionTitle: {
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  carrierList: {
    marginBottom: spacing.md,
  },
  carrierPressable: {
    marginBottom: spacing.sm,
  },
  carrierCard: {
    padding: spacing.md,
  },
  selectedCard: {
    borderWidth: 2,
  },
  carrierTitle: {
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  carrierSubtitle: {
    fontSize: 13,
  },
  stepsCard: {
    marginBottom: spacing.md,
  },
  stepsTitle: {
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  stepText: {
    marginBottom: spacing.xs,
  },
  helperCard: {
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  helperTitle: {
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  helperText: {
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
