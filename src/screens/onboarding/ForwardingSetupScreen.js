import React, { useContext, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
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

function getActivationParts(carrier) {
  switch (carrier) {
    case "Verizon":
      return { prefix: "*72", suffix: "" };
    case "AT&T":
      return { prefix: "*21*", suffix: "#" };
    case "T-Mobile":
      return { prefix: "**21*1", suffix: "#" };
    default:
      return null;
  }
}

function getForwardingStatus(payload) {
  return String(
    payload?.forwardingStatus ||
      payload?.status ||
      payload?.forwarding?.status ||
      ""
  ).toLowerCase();
}

function getNextRouteFromStatus(status) {
  const normalized = String(status || "").toLowerCase();
  if (["verified", "complete", "completed"].includes(normalized)) return "ForwardingSuccess";
  if (
    ["pending_verification", "verification_started", "testing", "verifying", "failed", "active", "activated"].includes(
      normalized
    )
  ) {
    return "ForwardingVerify";
  }
  return null;
}

export default function ForwardingSetupScreen({ navigation }) {
  const { colors, resolvedTheme } = useTheme();
  const { onboardingData, updateData, setLocalStep, navigateFromBackend } = useContext(OnboardingContext);
  const [carrier, setCarrier] = useState(onboardingData?.forwardingCarrier || "Verizon");
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [statusPayload, setStatusPayload] = useState(null);
  const [error, setError] = useState("");

  const forwardFromNumber = statusPayload?.forwardFromNumber || statusPayload?.businessNumber || "";
  const forwardToNumber = statusPayload?.forwardToNumber || statusPayload?.destinationNumber || "";
  const activationParts = useMemo(() => getActivationParts(carrier), [carrier]);
  const activationNumber = normalizeDigits(forwardToNumber);
  const activationCodePreview = activationParts
    ? `${activationParts.prefix}${activationNumber}${activationParts.suffix}`
    : "";

  useEffect(() => {
    setLocalStep(STEPS.FORWARDING_SETUP);
  }, [setLocalStep]);

  useEffect(() => {
    if (onboardingData?.forwardingCarrier) {
      setCarrier(onboardingData.forwardingCarrier);
    }
  }, [onboardingData?.forwardingCarrier]);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/phone/forwarding/status");
      const payload = response.data || {};
      setStatusPayload(payload);

      const nextRoute = getNextRouteFromStatus(getForwardingStatus(payload));
      if (nextRoute) {
        await navigateFromBackend(navigation);
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load forwarding details");
    } finally {
      setLoading(false);
    }
  }

  async function handleCarrierSelect(nextCarrier) {
    setCarrier(nextCarrier);
    await updateData({ forwardingCarrier: nextCarrier });
  }

  async function handleActivate() {
    if (!activationNumber) {
      setError("Forwarding line unavailable. Please try again.");
      return;
    }

    if (!activationParts) {
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
      await updateData({
        forwardingCarrier: carrier,
        forwardingActivationDialString: activationCodePreview,
      });
      await setLocalStep(STEPS.FORWARDING_VERIFICATION);
      await Linking.openURL(`tel:${encodeURIComponent(activationCodePreview)}`);
      await navigateFromBackend(navigation);
    } catch (e) {
      setError(e?.message || "Could not open the dialer");
    } finally {
      setActivating(false);
    }
  }

  async function handleSkip() {
    setSkipping(true);
    setError("");
    try {
      await api.post("/onboarding/step", {
        step: STEPS.FORWARDING_SETUP,
        status: "skipped",
      });
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
        title="Activate call forwarding"
        subtitle="Keep your current number and send business calls into Glō in a few taps."
      />

      <AppCard style={styles.numberCard}>
        <View style={styles.numberRow}>
          <AppText style={styles.label}>Your business number</AppText>
          <AppText style={styles.value}>{formatPhoneNumber(forwardFromNumber)}</AppText>
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
                  {selected && activationParts
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

      {!!error ? <AppText style={[styles.error, { color: colors.danger }]}>{error}</AppText> : null}

      <AppButton
        label={activating ? "Opening dialer..." : "Activate forwarding"}
        onPress={handleActivate}
        disabled={activating || loading}
        style={styles.primaryButton}
      />
      <AppButton
        label={skipping ? "Saving..." : "I’ll do this later"}
        variant="secondary"
        onPress={handleSkip}
        disabled={skipping}
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
