import React, { useContext, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import api from "../../config/api";
import { STEPS } from "../../onboarding/stepKeys";
import AppButton from "../../components/ui/AppButton";
import AppText from "../../components/ui/AppText";
import AppCard from "../../components/ui/AppCard";
import OnboardingHero from "../../components/onboarding/OnboardingHero";
import { spacing } from "../../ui/tokens";
import { useTheme } from "../../theme/ThemeContext";
import { getStrings, normalizeLanguage } from "../../utils/i18n";

export default function NumberStrategyScreen({ navigation }) {
  const { updateStep, onboardingData, navigateFromBackend } = useContext(OnboardingContext);
  const { colors } = useTheme();
  const t = getStrings(normalizeLanguage(onboardingData?.preferredLanguage));
  const [choice, setChoice] = useState(
    onboardingData?.numberStrategy === "port_existing"
      ? "new_number"
      : onboardingData?.numberStrategy || "new_number"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const OPTIONS = [
    {
      key: "new_number",
      title: t.numberStrategyNewTitle,
      tag: t.numberStrategyNewTag,
      desc: t.numberStrategyNewDesc,
    },
    {
      key: "forward_existing",
      title: t.numberStrategyForwardTitle,
      tag: t.numberStrategyForwardTag,
      desc: t.numberStrategyForwardDesc,
    },
  ];

  async function handleContinue() {
    setSubmitting(true);
    setError("");
    try {
      await api.post("/phone/number-strategy", { strategy: choice });
      await updateStep(STEPS.NUMBER_STRATEGY, { numberStrategy: choice }, { analyticsProps: { numberStrategy: choice } });
      await navigateFromBackend(navigation);
    } catch (e) {
      setError(e?.response?.data?.message || t.failedToSave);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <OnboardingHero
        stepLabel="Step 4 of 9"
        title={t.numberStrategyTitle}
        subtitle={t.numberStrategySubtitle}
      />
      {OPTIONS.map((option) => {
        const selected = choice === option.key;
        return (
          <Pressable
            key={option.key}
            onPress={() => setChoice(option.key)}
            style={styles.pressable}
          >
            <AppCard style={[styles.card, selected && { borderWidth: 2, borderColor: colors.textPrimary }]}>
              <AppText style={[styles.title, { color: colors.textPrimary }]}>
                {option.title}
              </AppText>
              <View style={[styles.tag, selected && { backgroundColor: colors.textPrimary }]}>
                <AppText style={[styles.tagText, { color: selected ? colors.bg : colors.textSecondary }]}>
                  {option.tag}
                </AppText>
              </View>
              <AppText style={[styles.desc, { color: colors.textSecondary }]}>
                {option.desc}
              </AppText>
            </AppCard>
          </Pressable>
        );
      })}
      {!!error && (
        <AppText style={[styles.error, { color: colors.danger }]}>{error}</AppText>
      )}
      <AppButton
        style={styles.button}
        disabled={submitting}
        onPress={handleContinue}
        label={submitting ? t.saving : t.numberStrategyContinue}
        variant="primary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "flex-start",
    paddingTop: spacing.xl,
  },
  pressable: { marginBottom: spacing.sm },
  card: { padding: 0 },
  title: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  tag: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: "rgba(128,128,128,0.15)",
    marginBottom: 8,
  },
  tagText: { fontSize: 11, fontWeight: "700" },
  desc: { fontSize: 13, lineHeight: 19 },
  button: { marginTop: spacing.md },
  error: { fontWeight: "700", marginBottom: spacing.sm },
});
