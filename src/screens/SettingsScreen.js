import React, { useContext, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, Linking, Platform } from "react-native";
import api from "../config/api";
import { AuthContext } from "../auth/authContext";
import ScreenContainer from "../components/layout/ScreenContainer";

export default function SettingsScreen({ navigation }) {
  const { logout } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSubscription();
  }, []);

  async function loadSubscription() {
    try {
      setLoading(true);
      setError("");

      // TODO (M6.1-B): Confirm REAL backend endpoint on Windows laptop and update path
      const res = await api.get("/billing/status");

      setSub(res.data);
    } catch (e) {
      setError(
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        "Failed to load billing status"
      );
    } finally {
      setLoading(false);
    }
  }

  async function openBillingPortal() {
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

  function formatDate(d) {
    if (!d) return "—";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleDateString();
  }

  const status =
    sub?.subscription?.status ||
    sub?.subscriptionStatus ||
    (sub?.isSubscribed ? "active" : "none");

  // Backend returns startedAt + canceledAt.
  // We'll show canceledAt if present, else startedAt as a fallback "since" date.
  const endsAt =
    sub?.subscription?.canceledAt ||
    sub?.subscription?.startedAt ||
    null;

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Subscription</Text>

        {loading ? (
          <Text style={styles.text}>Loading…</Text>
        ) : error ? (
          <Text style={[styles.text, styles.error]}>{error}</Text>
        ) : (
          <>
            <Text style={styles.text}>
              Status: <Text style={styles.bold}>{String(status)}</Text>
            </Text>
            <Text style={styles.text}>
              Ends: <Text style={styles.bold}>{formatDate(endsAt)}</Text>
            </Text>
          </>
        )}

        <Pressable style={styles.btn} onPress={openBillingPortal}>
          <Text style={styles.btnText}>Manage Billing</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>

        <Pressable style={styles.rowButton} onPress={() => navigation.navigate("Account")}>
          <Text style={styles.rowText}>Account</Text>
        </Pressable>

        <Pressable
          style={[styles.btn, styles.logoutBtn]}
          onPress={() =>
            Alert.alert("Log out", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              { text: "Log out", style: "destructive", onPress: logout },
            ])
          }
        >
          <Text style={[styles.btnText, styles.logoutText]}>Log out</Text>
        </Pressable>
      </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: "900", marginBottom: 14 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: "900", marginBottom: 10 },
  text: { fontSize: 14, color: "#111", marginBottom: 6 },
  bold: { fontWeight: "900" },
  error: { color: "red" },
  btn: {
    marginTop: 10,
    backgroundColor: "#000",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "900" },
  logoutBtn: { backgroundColor: "#eee" },
  logoutText: { color: "#b00" },
  rowButton: { paddingVertical: 12 },
  rowText: { fontSize: 16, color: "#111", fontWeight: "700", marginBottom: 6 },
});
