import React, { useContext, useEffect, useState } from "react";
import {
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import { AuthContext } from "../../auth/authContext";
import OnboardingHeader from "../../onboarding/OnboardingHeader";
import { STEPS } from "../../onboarding/stepKeys";
import AppText from "../../components/ui/AppText";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import OnboardingHero from "../../components/onboarding/OnboardingHero";
import { spacing } from "../../ui/tokens";
import { useTheme } from "../../theme/ThemeContext";
import { getStrings, normalizeLanguage } from "../../utils/i18n";

export default function PhoneSignupScreen({ navigation }) {
  const { updateStep, setLocalStep, updateData, onboardingData, navigateFromBackend } = useContext(OnboardingContext);
  const { barber } = useContext(AuthContext);
  const { colors } = useTheme();
  const t = getStrings(normalizeLanguage(onboardingData?.preferredLanguage));
  const [phone, setPhone] = useState(onboardingData?.phoneNumber || barber?.phoneNumber || "");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState(onboardingData?.phoneNumber || barber?.phoneNumber ? "CONFIRMED" : "PHONE"); // PHONE -> OTP -> CONFIRMED
  const [error, setError] = useState("");

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

  useEffect(() => {
    const existingPhone = onboardingData?.phoneNumber || barber?.phoneNumber || "";
    if (existingPhone && !phone) {
      setPhone(existingPhone);
    }
    if (existingPhone) {
      setStage("CONFIRMED");
    }
  }, [barber?.phoneNumber, onboardingData?.phoneNumber, phone]);

  function handleSendOtp() {
    setError("");
    if (!phone || phone.length < 10) {
      setError(t.accountInvalidPhone);
      return;
    }
    // Placeholder: backend wiring later
    setStage("OTP");
  }

  async function handleVerifyOtp() {
    setError("");
    if (!otp || otp.length < 4) {
      setError(t.accountInvalidCode);
      return;
    }
    const normalizedPhoneNumber = normalizePhoneToE164(phone);
    if (!normalizedPhoneNumber) {
      setError(t.accountInvalidPhone);
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

  async function handleContinueWithExistingPhone() {
    setError("");
    const normalizedPhoneNumber = normalizePhoneToE164(phone);
    if (!normalizedPhoneNumber) {
      setError(t.accountInvalidPhone);
      return;
    }

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
            title={t.accountTitle}
            subtitle={t.accountSubtitle}
          />

          {stage === "PHONE" ? (
            <>
              <AppCard style={styles.fieldCard}>
                <AppText style={styles.label}>{t.accountPhoneLabel}</AppText>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={t.accountPhonePlaceholder}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                />
              </AppCard>
              {!!error && <AppText style={[styles.error, { color: colors.danger }]}>{error}</AppText>}

              <AppButton style={styles.button} onPress={handleSendOtp} label={t.accountSendCode} />
            </>
          ) : stage === "CONFIRMED" ? (
            <>
              <AppCard style={styles.fieldCard}>
                <AppText style={styles.label}>{t.accountPhoneLabel}</AppText>
                <AppText>{phone}</AppText>
              </AppCard>
              {!!error && <AppText style={[styles.error, { color: colors.danger }]}>{error}</AppText>}
              <AppButton style={styles.button} onPress={handleContinueWithExistingPhone} label={t.accountContinue} />
            </>
          ) : (
            <>
              <AppCard style={styles.fieldCard}>
                <AppText style={styles.label}>{t.accountEnterCode}</AppText>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  placeholder={t.accountCodePlaceholder}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                />
              </AppCard>
              {!!error && <AppText style={[styles.error, { color: colors.danger }]}>{error}</AppText>}

              <AppButton style={styles.button} onPress={handleVerifyOtp} label={t.accountVerify} />
              <AppButton style={styles.linkBtn} variant="secondary" onPress={() => setStage("PHONE")} label={t.accountChangeNumber} />
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
