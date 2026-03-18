import React, { useContext, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import api from "../../config/api";
import OnboardingHeader from "../../onboarding/OnboardingHeader";
import { STEPS } from "../../onboarding/stepKeys";
import AppButton from "../../components/ui/AppButton";
import AppText from "../../components/ui/AppText";
import AppCard from "../../components/ui/AppCard";
import OnboardingHero from "../../components/onboarding/OnboardingHero";
import { spacing } from "../../ui/tokens";
import { useTheme } from "../../theme/ThemeContext";

export default function NumberStrategyScreen({ navigation }) {
  const { updateStep, onboardingData, navigateFromBackend } = useContext(OnboardingContext);
  const { colors } = useTheme();
  const [choice, setChoice] = useState(onboardingData?.numberStrategy || "new_number");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function canNavigateTo(routeName) {
    const routeNames = navigation?.getState?.()?.routeNames || [];
    return routeNames.includes(routeName);
  }

  function normalizePhoneToE164(value) {
    const digits = String(value || "").replace(/[^\d]/g, "");
    if (!digits) return "";
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
    return "";
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      let forwardFromNumber;

      if (choice === "forward_existing") {
        forwardFromNumber = normalizePhoneToE164(onboardingData?.phoneNumber);
        if (!forwardFromNumber) {
          setError("We couldn't find the number from Step 2. Go back and confirm your business phone number.");
          setSubmitting(false);
          return;
        }
      }

      const strategyPayload = {
        strategy: choice,
        ...(choice === "forward_existing" && {
          forwardFromNumber,
        }),
      };

      await api.post("/phone/number-strategy", strategyPayload);

      await updateStep(
        STEPS.NUMBER_STRATEGY,
        {
          numberStrategy: choice,
          ...(choice === "forward_existing" && { forwardFromNumber }),
        },
        { analyticsProps: { numberStrategy: choice } }
      );
      await navigateFromBackend(navigation);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save number strategy");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <OnboardingHeader />
      <OnboardingHero
        stepLabel="Step 5 of 10"
        title="Choose Your Number Strategy"
        subtitle="Keep your number, port it over, or start fresh with a new Glō number."
      />

      <Pressable
        onPress={() => setChoice("forward_existing")}
        style={styles.cardPressable}
      >
        <AppCard style={[styles.card, choice === "forward_existing" && styles.cardSelected, choice === "forward_existing" && { borderColor: colors.textPrimary }]}>
          <AppText style={styles.cardTitle}>Keep my number</AppText>
          <AppText style={styles.cardTag}>Fastest setup</AppText>
          <AppText style={styles.cardDesc}>Keep your current business number and route calls into Glō.</AppText>
        </AppCard>
      </Pressable>

      <Pressable
        onPress={() => setChoice("port_existing")}
        style={styles.cardPressable}
      >
        <AppCard style={[styles.card, choice === "port_existing" && styles.cardSelected, choice === "port_existing" && { borderColor: colors.textPrimary }]}>
          <AppText style={styles.cardTitle}>Port my number</AppText>
          <AppText style={styles.cardTag}>Best long-term</AppText>
          <AppText style={styles.cardDesc}>Transfer your current business line into Glō.</AppText>
        </AppCard>
      </Pressable>

      <Pressable
        onPress={() => setChoice("new_number")}
        style={styles.cardPressable}
      >
        <AppCard style={[styles.card, choice === "new_number" && styles.cardSelected, choice === "new_number" && { borderColor: colors.textPrimary }]}>
          <AppText style={styles.cardTitle}>Get a new Glō number</AppText>
          <AppText style={styles.cardTag}>Instant</AppText>
          <AppText style={styles.cardDesc}>Start faster with a new number now.</AppText>
        </AppCard>
      </Pressable>

      {!!error ? <AppText style={[styles.error, { color: colors.danger }]}>{error}</AppText> : null}

      <AppButton
        style={styles.button}
        disabled={submitting}
        onPress={submit}
        label={submitting ? "Saving..." : "Continue"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  cardPressable: { marginBottom: spacing.sm },
  card: {
    padding: spacing.md,
  },
  cardSelected: { borderWidth: 2 },
  cardTitle: { fontWeight: "800", fontSize: 16, marginBottom: 6 },
  cardTag: { fontSize: 12, fontWeight: "800", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
  cardDesc: { fontSize: 13 },
  button: { marginTop: 10 },
  error: { fontWeight: "700", marginBottom: 8 },
});
