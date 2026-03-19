import React, { useState } from "react";
import { View, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useStripe, CardField } from "@stripe/stripe-react-native";
import { useContext } from "react";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import { STEPS } from "../../onboarding/stepKeys";
import api from "../../config/api";
import AppText from "../../components/ui/AppText";
import AppButton from "../../components/ui/AppButton";
import OnboardingHeader from "../../onboarding/OnboardingHeader";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../ui/tokens";

export default function TrialStartScreen({ navigation }) {
  const { confirmSetupIntent } = useStripe();
  const { updateStep, navigateFromBackend } = useContext(OnboardingContext);
  const { colors } = useTheme();
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
        title="Start your free trial"
        subtitle="Enter your card to activate. You won't be charged during your trial period."
      />

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

      <AppText style={[styles.disclaimer, { color: colors.textSecondary }]}>
        Your card is saved securely via Stripe. You will not be charged until your trial ends.
      </AppText>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.accent} />
      ) : (
        <AppButton
          variant="primary"
          label="Start free trial"
          style={styles.btn}
          onPress={handleStartTrial}
          disabled={!cardComplete}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  cardField: { width: "100%", height: 56, marginVertical: spacing.lg },
  disclaimer: { fontSize: 13, marginBottom: spacing.lg, textAlign: "center" },
  loader: { marginTop: spacing.md },
  btn: { marginTop: spacing.sm },
});
