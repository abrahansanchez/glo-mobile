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

export default function NumberStrategyScreen({ navigation }) {
  const { updateStep, updateData, onboardingData } = useContext(OnboardingContext);
  const [choice, setChoice] = useState(onboardingData?.numberStrategy || "new_number");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function canNavigateTo(routeName) {
    const routeNames = navigation?.getState?.()?.routeNames || [];
    return routeNames.includes(routeName);
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      await api.post("/phone/number-strategy", { strategy: choice });
      await updateData({ numberStrategy: choice });
      const result = await updateStep(STEPS.NUMBER_STRATEGY);
      if (result?.complete) return;
      if (choice === "port_existing") {
        if (canNavigateTo("PortingForm")) {
          navigation.navigate("PortingForm");
        }
      } else {
        if (canNavigateTo("TrialStart")) {
          navigation.navigate("TrialStart");
        }
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save number strategy");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <OnboardingHeader />
      <OnboardingHero
        stepLabel="Step 4 of 9"
        title="Choose Your Number Strategy"
        subtitle="Port your current number or start with a new Glō number."
      />

      <Pressable
        onPress={() => setChoice("port_existing")}
        style={styles.cardPressable}
      >
        <AppCard style={[styles.card, choice === "port_existing" && styles.cardSelected]}>
          <AppText style={styles.cardTitle}>Port my existing number</AppText>
          <AppText style={styles.cardDesc}>Transfer your current business line into Glō.</AppText>
        </AppCard>
      </Pressable>

      <Pressable
        onPress={() => setChoice("new_number")}
        style={styles.cardPressable}
      >
        <AppCard style={[styles.card, choice === "new_number" && styles.cardSelected]}>
          <AppText style={styles.cardTitle}>Get a new Glō number</AppText>
          <AppText style={styles.cardDesc}>Start faster with a new number now.</AppText>
        </AppCard>
      </Pressable>

      {!!error ? <AppText style={styles.error}>{error}</AppText> : null}

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
  cardSelected: { borderColor: "#111827", borderWidth: 2 },
  cardTitle: { fontWeight: "800", fontSize: 16, marginBottom: 6 },
  cardDesc: { fontSize: 13 },
  button: { marginTop: 10 },
  error: { color: "#b00020", fontWeight: "700", marginBottom: 8 },
});
