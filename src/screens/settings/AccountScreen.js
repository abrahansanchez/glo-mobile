import React, { useContext } from "react";
import { View, StyleSheet, Alert, Linking } from "react-native";
import { AuthContext } from "../../auth/authContext";
import api from "../../config/api";
import { resetAppState } from "../../utils/devReset";
import ScreenContainer from "../../components/layout/ScreenContainer";
import AppCard from "../../components/ui/AppCard";
import AppText from "../../components/ui/AppText";
import AppButton from "../../components/ui/AppButton";
import { spacing } from "../../ui/tokens";

export default function AccountScreen() {
  const { barber, logout, subscriptionStatus, stripeCustomerId } = useContext(AuthContext);
  const canManageBilling = typeof stripeCustomerId === "string" && stripeCustomerId.startsWith("cus_");

  async function openBillingPortal() {
    if (!canManageBilling) {
      Alert.alert("Billing", "Billing portal will be available after your billing profile is created.");
      return;
    }
    try {
      const res = await api.post("/billing/portal");
      const url = res.data?.url;
      if (!url) {
        Alert.alert("Billing", "No billing portal URL returned.");
        return;
      }
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert("Billing", "Unable to open billing portal on this device.");
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      const code = e?.response?.data?.error || e?.response?.data?.code;
      if (code === "BILLING_NOT_AVAILABLE" || code === "NO_STRIPE_CUSTOMER") {
        Alert.alert("Billing", "Billing portal is not available yet. Please try again shortly.");
        return;
      }
      if (code === "CONFIG_MISSING_RETURN_URL" || /stripe|return[_\s-]?url/i.test(String(e?.response?.data?.message || ""))) {
        Alert.alert("Billing", "Billing is temporarily unavailable. Try again later.");
        return;
      }
      Alert.alert("Billing", e?.response?.data?.error || e?.response?.data?.message || "Failed to open billing portal");
    }
  }

  async function handleDevReset() {
    Alert.alert(
      "Reset App State (DEV ONLY)",
      "This will wipe auth, barber, onboarding, and subscription data. You will need to log in again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await resetAppState({ barberId: barber?.id || barber?._id });
            Alert.alert("Success", "App state wiped. Please restart the app.");
          },
        },
      ]
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <AppText variant="title" style={styles.title}>Account</AppText>

        <AppCard style={styles.card}>
          <AppText variant="section" style={styles.cardTitle}>Subscription</AppText>
          <AppText style={styles.text}>
            Status: <AppText style={styles.bold}>{String(subscriptionStatus)}</AppText>
          </AppText>
          {!canManageBilling ? (
            <AppText variant="caption" style={styles.helperText}>
              Billing portal unlocks after Stripe customer setup completes.
            </AppText>
          ) : null}
          <AppButton
            label="Manage Billing"
            variant="primary"
            style={styles.button}
            onPress={openBillingPortal}
            disabled={!canManageBilling}
          />
        </AppCard>

        <AppCard style={styles.card}>
          <AppText variant="section" style={styles.cardTitle}>Profile</AppText>
          <AppText style={styles.text}>
            Name: <AppText style={styles.bold}>{barber?.name || "—"}</AppText>
          </AppText>
          <AppText style={styles.text}>
            Email: <AppText style={styles.bold}>{barber?.email || "—"}</AppText>
          </AppText>
        </AppCard>

        <AppCard style={styles.card}>
          <AppButton label="Log out" variant="danger" style={styles.button} onPress={() => logout()} />
        </AppCard>

        {__DEV__ ? (
          <AppCard style={styles.card}>
            <AppText variant="section" style={styles.cardTitle}>Developer</AppText>
            <AppButton label="Reset App State" variant="secondary" style={styles.button} onPress={handleDevReset} />
          </AppCard>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { marginBottom: spacing.md },
  card: { marginBottom: spacing.md },
  cardTitle: { marginBottom: spacing.sm },
  text: { marginBottom: spacing.xs },
  bold: { fontWeight: "900" },
  helperText: { marginBottom: spacing.xs },
  button: { marginTop: spacing.sm },
});
