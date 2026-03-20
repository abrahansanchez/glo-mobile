import React, { useState } from "react";
import { View, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useStripe, CardField } from "@stripe/stripe-react-native";
import { useContext } from "react";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import { STEPS } from "../../onboarding/stepKeys";
import api from "../../config/api";
import AppText from "../../components/ui/AppText";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import OnboardingHeader from "../../onboarding/OnboardingHeader";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../ui/tokens";
import { getStrings, normalizeLanguage } from "../../utils/i18n";

export default function TrialStartScreen({ navigation }) {
  const { confirmSetupIntent } = useStripe();
  const { updateStep, navigateFromBackend, onboardingData } = useContext(OnboardingContext);
  const { colors } = useTheme();
  const t = getStrings(normalizeLanguage(onboardingData?.preferredLanguage));
  const [loading, setLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  const handleStartTrial = async () => {
    if (!cardComplete) {
      Alert.alert("Card required", "Please enter your card details to continue.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/billing/setup-intent");
      const { clientSecret } = data;
      if (!clientSecret) throw new Error("Failed to initialize payment setup.");

      const { error } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: "Card",
      });
      if (error) throw new Error(error.message);

      await api.post("/billing/trial/start");

      await updateStep(STEPS.TRIAL_START);
      await navigateFromBackend(navigation);
    } catch (err) {
      Alert.alert("Error", err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <OnboardingHeader
        stepLabel="Step 7 of 10"
        title={t.trialTitle}
        subtitle={t.trialSubtitle}
      />

      <AppCard style={styles.cardWrapper}>
        <AppText style={{ fontWeight: "700", marginBottom: spacing.sm }}>{t.trialPaymentLabel}</AppText>
        <CardField
          postalCodeEnabled={true}
          onCardChange={(cardDetails) => setCardComplete(cardDetails.complete)}
          style={styles.cardField}
          cardStyle={{
            backgroundColor: colors.surface,
            textColor: colors.textPrimary,
            borderRadius: 8,
            borderWidth: 0.5,
            borderColor: colors.border,
          }}
        />
        <AppText style={{ fontSize: 12, textAlign: "center", marginTop: spacing.sm, color: colors.textSecondary }}>
          {t.trialSecured}
        </AppText>
      </AppCard>

      <AppText style={[styles.disclaimer, { color: colors.textSecondary }]}>
        {t.trialDisclaimer}
      </AppText>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.accent} />
      ) : (
        <AppButton
          variant="primary"
          label={t.trialBtn}
          style={styles.btn}
          onPress={handleStartTrial}
          disabled={!cardComplete}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "flex-start", paddingTop: spacing.xl },
  cardWrapper: { padding: spacing.md },
  cardField: { width: "100%", height: 50 },
  disclaimer: { fontSize: 13, marginBottom: spacing.lg, textAlign: "center" },
  loader: { marginTop: spacing.md },
  btn: { marginTop: spacing.sm },
});
