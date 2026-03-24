import React, { useContext, useEffect, useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
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
import { getStrings, normalizeLanguage } from "../../utils/i18n";

export default function BusinessSetupScreen({ navigation }) {
  const { updateStep, setLocalStep, updateData, onboardingData, navigateFromBackend } =
    useContext(OnboardingContext);
  const { colors } = useTheme();
  const t = getStrings(normalizeLanguage(onboardingData?.preferredLanguage));
  const [barberName, setBarberName] = useState(
    onboardingData?.barberName || onboardingData?.shopName || ""
  );
  const [error, setError] = useState("");

  useEffect(() => {
    setLocalStep(STEPS.BUSINESS_SNAPSHOT);
  }, [setLocalStep]);

  async function handleContinue() {
    setError("");
    const trimmed = barberName.trim();
    if (!trimmed) {
      setError(t.barberNameError || "Please enter your name to continue.");
      return;
    }

    try {
      // Post directly to backend with barberName in the data field
      // Do not rely on updateData state timing — pass data explicitly
      await api.post("/onboarding/step", {
        step: STEPS.BUSINESS_SNAPSHOT,
        completed: true,
        data: { barberName: trimmed, shopName: trimmed },
      });

      // Update local context after successful post
      await updateData({ barberName: trimmed, shopName: trimmed });
      await navigateFromBackend(navigation);
    } catch (e) {
      console.log("[BUSINESS_SNAPSHOT] post failed:", e?.message);
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.safe, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={24}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <OnboardingHeader />
          <OnboardingHero
            stepLabel="Step 3 of 9"
            title={t.barberNameTitle}
            subtitle={t.barberNameSubtitle}
          />
          <AppCard style={styles.fieldCard}>
            <AppText style={[styles.label, { color: colors.textSecondary }]}>
              {t.barberNameLabel}
            </AppText>
            <TextInput
              value={barberName}
              onChangeText={setBarberName}
              placeholder={t.barberNamePlaceholder}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              style={[
                styles.input,
                { borderColor: colors.border, color: colors.textPrimary },
              ]}
            />
          </AppCard>
          {!!error && (
            <AppText style={[styles.error, { color: colors.danger }]}>
              {error}
            </AppText>
          )}
          <AppButton
            style={styles.button}
            onPress={handleContinue}
            label={t.barberNameContinue}
            variant="primary"
          />
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "flex-start",
    paddingTop: spacing.xl,
  },
  fieldCard: { marginBottom: spacing.sm, padding: spacing.md },
  label: { fontSize: 12, fontWeight: "600", marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  button: { marginTop: spacing.md },
  error: { marginBottom: spacing.sm, fontWeight: "700" },
});
