import React, { useContext, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import api from "../../config/api";
import { STEPS } from "../../onboarding/stepKeys";
import AppCard from "../../components/ui/AppCard";
import AppText from "../../components/ui/AppText";
import OnboardingHero from "../../components/onboarding/OnboardingHero";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../ui/tokens";

const LANGUAGE_OPTIONS = [
  { key: "en", label: "English" },
  { key: "es", label: "Español" },
];

export default function LanguageScreen({ navigation }) {
  const { colors } = useTheme();
  const { setLocalStep, updateData, navigateFromBackend } = useContext(OnboardingContext);
  const [submitting, setSubmitting] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setLocalStep(STEPS.LANGUAGE);
  }, [setLocalStep]);

  async function handleSelect(preferredLanguage) {
    if (submitting) return;

    setSubmitting(preferredLanguage);
    setError("");
    try {
      await api.post("/onboarding/step", {
        step: STEPS.LANGUAGE,
        data: { preferredLanguage },
      });
      await updateData({ preferredLanguage });
      await navigateFromBackend(navigation);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to save language");
    } finally {
      setSubmitting("");
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <OnboardingHero
        stepLabel="Step 2 of 10"
        title="Choose your language"
        subtitle="Pick the language you want to use in onboarding."
      />

      {LANGUAGE_OPTIONS.map((option) => (
        <Pressable
          key={option.key}
          onPress={() => handleSelect(option.key)}
          disabled={Boolean(submitting)}
          style={styles.optionPressable}
        >
          <AppCard
            style={[
              styles.optionCard,
              submitting === option.key && styles.optionCardSubmitting,
            ]}
          >
            <AppText style={styles.optionTitle}>{option.label}</AppText>
          </AppCard>
        </Pressable>
      ))}

      {!!submitting ? (
        <AppText style={[styles.helperText, { color: colors.textSecondary }]}>Saving your language…</AppText>
      ) : null}
      {!!error ? <AppText style={[styles.errorText, { color: colors.danger }]}>{error}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  optionPressable: {
    marginBottom: spacing.sm,
  },
  optionCard: {
    padding: spacing.lg,
  },
  optionCardSubmitting: {
    opacity: 0.7,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  helperText: {
    marginTop: spacing.sm,
    fontWeight: "700",
  },
  errorText: {
    marginTop: spacing.sm,
    fontWeight: "700",
  },
});
