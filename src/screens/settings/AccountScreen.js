import React, { useContext } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Linking } from "react-native";
import { AuthContext } from "../../auth/authContext";
import api from "../../config/api";
import { resetAppState } from "../../utils/devReset";

export default function AccountScreen() {
  const { barber, logout, subscriptionStatus } = useContext(AuthContext);

  async function openBillingPortal() {
    try {
      const res = await api.post("/billing/portal");
      const url = res.data?.url;
      if (!url) return Alert.alert("Billing", "No billing portal URL returned.");
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) return Alert.alert("Billing", "Unable to open billing portal on this device.");
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert("Billing", e?.response?.data?.error || e?.response?.data?.message || "Failed to open billing portal");
    }
  }

  async function handleDevReset() {
    Alert.alert(
      "Reset App State (DEV ONLY)",
      "This will wipe all auth, barber, onboarding, and subscription data. You will need to log in again.",
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
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Account</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Subscription</Text>
          <Text style={styles.text}>Status: <Text style={styles.bold}>{String(subscriptionStatus)}</Text></Text>
          <Pressable style={styles.btn} onPress={openBillingPortal}>
            <Text style={styles.btnText}>Manage Billing</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile</Text>
          <Text style={styles.text}>Name: <Text style={styles.bold}>{barber?.name || "—"}</Text></Text>
          <Text style={styles.text}>Email: <Text style={styles.bold}>{barber?.email || "—"}</Text></Text>
        </View>

        <View style={styles.card}>
          <Pressable style={[styles.btn, styles.logoutBtn]} onPress={() => logout()}>
            <Text style={[styles.btnText, styles.logoutText]}>Log out</Text>
          </Pressable>
        </View>

        {__DEV__ && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Developer</Text>
            <Pressable style={[styles.btn, styles.devBtn]} onPress={handleDevReset}>
              <Text style={[styles.btnText, styles.devBtnText]}>Reset App State</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  title: { fontSize: 28, fontWeight: "900", marginBottom: 14 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: "900", marginBottom: 10 },
  text: { fontSize: 14, color: "#111", marginBottom: 6 },
  bold: { fontWeight: "900" },
  btn: { marginTop: 10, backgroundColor: "#000", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "900" },
  logoutBtn: { backgroundColor: "#eee" },
  logoutText: { color: "#b00" },
  devBtn: { backgroundColor: "#f5f5f5" },
  devBtnText: { color: "#666" },
});
