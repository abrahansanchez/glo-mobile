import React, { useContext, useEffect, useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import OnboardingHeader from "../../onboarding/OnboardingHeader";
import { STEPS } from "../../onboarding/stepKeys";
import AppText from "../../components/ui/AppText";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import OnboardingHero from "../../components/onboarding/OnboardingHero";
import { spacing } from "../../ui/tokens";
import { useTheme } from "../../theme/ThemeContext";

export default function PhoneSignupScreen({ navigation }) {
  const { updateStep, setLocalStep, updateData, onboardingData, navigateFromBackend } = useContext(OnboardingContext);
  const { colors } = useTheme();
  const [phone, setPhone] = useState(onboardingData?.phoneNumber || "");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState("PHONE"); // PHONE -> OTP
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

  useEffect(() => {
    setLocalStep(STEPS.ACCOUNT);
  }, [setLocalStep]);

  function handleSendOtp() {
    setError("");
    if (!phone || phone.length < 10) {
      setError("Enter a valid phone number");
      return;
    }
    // Placeholder: backend wiring later
    setStage("OTP");
  }

  async function handleVerifyOtp() {
    setError("");
    if (!otp || otp.length < 4) {
      setError("Enter a valid code");
      return;
    }
    const normalizedPhoneNumber = normalizePhoneToE164(phone);
    if (!normalizedPhoneNumber) {
      setError("Enter a valid phone number");
      return;
    }
    // Placeholder: real verify later -> should authenticate user
    // For now, we continue onboarding after login is handled separately
    await updateData({
      phoneNumber: normalizedPhoneNumber,
    });
    await updateStep(STEPS.ACCOUNT);
    await navigateFromBackend(navigation);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.safe, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={24}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.container}
        >
          <OnboardingHeader />
          <OnboardingHero
            stepLabel="Step 3 of 10"
            title="Create Your Workspace"
            subtitle="Confirm your number to secure your account."
          />

          {stage === "PHONE" ? (
            <>
              <AppCard style={styles.fieldCard}>
                <AppText style={styles.label}>Phone Number</AppText>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="(555) 555-5555"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                />
              </AppCard>
              {!!error && <AppText style={[styles.error, { color: colors.danger }]}>{error}</AppText>}

              <AppButton style={styles.button} onPress={handleSendOtp} label="Send Code" />
            </>
          ) : (
            <>
              <AppCard style={styles.fieldCard}>
                <AppText style={styles.label}>Enter Code</AppText>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="123456"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                />
              </AppCard>
              {!!error && <AppText style={[styles.error, { color: colors.danger }]}>{error}</AppText>}

              <AppButton style={styles.button} onPress={handleVerifyOtp} label="Verify" />
              <AppButton style={styles.linkBtn} variant="secondary" onPress={() => setStage("PHONE")} label="Change phone number" />
            </>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flexGrow: 1, padding: 24, justifyContent: "center", paddingBottom: 140 },
  fieldCard: { marginBottom: spacing.sm },
  label: { fontWeight: "700", marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 2 },
  button: { marginTop: 4 },
  error: { marginBottom: spacing.sm, fontWeight: "700" },
  linkBtn: { marginTop: 14, alignItems: "center" },
});
