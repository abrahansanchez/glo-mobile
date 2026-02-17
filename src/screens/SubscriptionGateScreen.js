import { View, Text, Pressable, StyleSheet, Alert, Linking } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useContext } from "react";
import api from "../config/api";
import { AuthContext } from "../auth/authContext";

export default function SubscriptionGateScreen({ reason }) {
  const { barber, logout, setSubscriptionStatus } = useContext(AuthContext);
  async function fixPayment() {
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
      Alert.alert(
        "Billing",
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Failed to open billing portal"
      );
    }
  }

  const openCheckout = () => {
    Linking.openURL("https://glo-backend-yaho.onrender.com/subscribe");
  };

  const handleDevReset = async () => {
    Alert.alert(
      "Reset App State (DEV ONLY)",
      "This will wipe all auth, barber, and onboarding data. You will return to the login screen.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              // Clear auth tokens
              await SecureStore.deleteItemAsync("glo_auth_token");

              // Clear barber data
              await SecureStore.deleteItemAsync("glo_barber");

              // Clear onboarding state for current barber if available
              const barberId = barber?.id || barber?._id;
              if (barberId) {
                await SecureStore.deleteItemAsync(
                  `glo_onboarding_complete_${barberId}`
                );
                await SecureStore.deleteItemAsync(`glo_onboarding_step_${barberId}`);
                await SecureStore.deleteItemAsync(`glo_onboarding_data_${barberId}`);
              }

              // Clean up accidental null keys
              await SecureStore.deleteItemAsync("glo_onboarding_complete_null");
              await SecureStore.deleteItemAsync("glo_onboarding_step_null");
              await SecureStore.deleteItemAsync("glo_onboarding_data_null");

              // Clear Authorization header
              try {
                delete api.defaults.headers.common.Authorization;
              } catch (e) {}

              // Reset subscription status and logout
              try {
                setSubscriptionStatus("unknown");
              } catch (e) {}
              await logout();

              Alert.alert("Success", "App state wiped. You will be returned to login.");
            } catch (e) {
              Alert.alert("Error", "Failed to reset app state: " + e.message);
            }
          },
        },
      ]
    );
  };

  const getMessage = () => {
    switch (reason) {
      case "SUBSCRIPTION_PAST_DUE":
        return "Your subscription is past due. Please update your payment.";
      case "INCOMPLETE":
        return "Your subscription setup is incomplete.";
      default:
        return "An active subscription is required to continue.";
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{getMessage()}</Text>
      <Pressable style={styles.btn} onPress={fixPayment}>
        <Text style={styles.btnText}>Fix Payment</Text>
      </Pressable>
      <Pressable style={[styles.btn, styles.secondary]} onPress={openCheckout}>
        <Text style={styles.btnText}>Subscribe / Manage Billing</Text>
      </Pressable>

      {__DEV__ && (
        <Pressable
          style={[styles.btn, styles.devBtn]}
          onPress={handleDevReset}
        >
          <Text style={[styles.btnText, styles.devBtnText]}>
            DEV: Reset App State
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  btn: {
    backgroundColor: "#000",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  btnText: { color: "#fff", fontWeight: "900" },
  secondary: { backgroundColor: "#eee" },
  devBtn: { backgroundColor: "#f5f5f5", marginTop: 16 },
  devBtnText: { color: "#666" },
});
