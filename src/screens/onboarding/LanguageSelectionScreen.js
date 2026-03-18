import React, { useContext, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import { routeForOnboardingStep } from "../../onboarding/routeForStep";
import { STEPS } from "../../onboarding/stepKeys";
import AppCard from "../../components/ui/AppCard";
import AppText from "../../components/ui/AppText";
import OnboardingHero from "../../components/onboarding/OnboardingHero";
import { useTheme } from "../../theme/ThemeContext";
import { getStrings, normalizeLanguage } from "../../utils/i18n";
import { spacing } from "../../ui/tokens";

export default function LanguageSelectionScreen({ navigation }) {
  const { colors } = useTheme();
  const { onboardingData, setLocalStep, updateStep } = useContext(OnboardingContext);
  const [submitting, setSubmitting] = useState("");
  const language = normalizeLanguage(onboardingData?.preferredLanguage);
  const t = getStrings(language);

  useEffect(() => {
    setLocalStep(STEPS.LANGUAGE);
  }, [setLocalStep]);

  async function selectLanguage(lang) {
    if (submitting) return;

    setSubmitting(lang);
    try {
      const result = await updateStep(
        STEPS.LANGUAGE,
        { preferredLanguage: lang },
        { analyticsProps: { preferredLanguage: lang } }
      );

      if (result?.complete) return;
      const nextStep = result?.step === STEPS.LANGUAGE ? STEPS.WELCOME : (result?.step || STEPS.WELCOME);
      navigation.replace(routeForOnboardingStep(nextStep));
    } catch (error) {
      console.error("Language selection failed", error);
    } finally {
      setSubmitting("");
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <OnboardingHero
        stepLabel="Step 1 of 10"
        title={t.chooseLanguage}
        subtitle={t.languageSubtitle}
      />

      <Pressable onPress={() => selectLanguage("en")} style={styles.optionPressable}>
        <AppCard
          style={[
            styles.optionCard,
            submitting === "en" && { opacity: 0.7 },
            language === "en" && styles.selectedCard,
            language === "en" && { borderColor: colors.textPrimary },
          ]}
        >
          <AppText style={styles.optionTitle}>{t.english}</AppText>
        </AppCard>
      </Pressable>

      <Pressable onPress={() => selectLanguage("es")} style={styles.optionPressable}>
        <AppCard
          style={[
            styles.optionCard,
            submitting === "es" && { opacity: 0.7 },
            language === "es" && styles.selectedCard,
            language === "es" && { borderColor: colors.textPrimary },
          ]}
        >
          <AppText style={styles.optionTitle}>{t.spanish}</AppText>
        </AppCard>
      </Pressable>

      {!!submitting && (
        <AppText style={[styles.savingText, { color: colors.textSecondary }]}>{t.saving}</AppText>
      )}
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
  selectedCard: {
    borderWidth: 2,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  savingText: {
    marginTop: spacing.sm,
    fontWeight: "700",
  },
});
