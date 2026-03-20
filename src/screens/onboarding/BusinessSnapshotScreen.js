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
import OnboardingHeader from "../../onboarding/OnboardingHeader";
import { STEPS } from "../../onboarding/stepKeys";
import AppButton from "../../components/ui/AppButton";
import AppText from "../../components/ui/AppText";
import AppCard from "../../components/ui/AppCard";
import OnboardingHero from "../../components/onboarding/OnboardingHero";
import { spacing } from "../../ui/tokens";
import { useTheme } from "../../theme/ThemeContext";

export default function BusinessSnapshotScreen({ navigation }) {
  const { updateStep, setLocalStep, updateData, onboardingData, navigateFromBackend } =
    useContext(OnboardingContext);
  const { colors } = useTheme();
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
      setError("Please enter your name to continue.");
      return;
    }
    await updateData({ barberName: trimmed, shopName: trimmed });
    await updateStep(STEPS.BUSINESS_SNAPSHOT);
    await navigateFromBackend(navigation);
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
            title="What's your name?"
            subtitle="We'll use this to personalize your AI receptionist."
          />
          <AppCard style={styles.fieldCard}>
            <AppText style={[styles.label, { color: colors.textSecondary }]}>
              Your name
            </AppText>
            <TextInput
              value={barberName}
              onChangeText={setBarberName}
              placeholder="e.g. Marcus"
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
            label="Continue"
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
