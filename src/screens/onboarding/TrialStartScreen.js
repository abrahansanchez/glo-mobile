import React, { useContext, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import api from "../../config/api";
import OnboardingHeader from "../../onboarding/OnboardingHeader";
import { STEPS } from "../../onboarding/stepKeys";

export default function TrialStartScreen({ navigation }) {
  const { updateStep } = useContext(OnboardingContext);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function startTrial() {
    setLoading(true);
    setError("");
    try {
      const idempotencyKey = `trial-start-${Date.now()}`;
      await api.post(
        "/billing/trial/start",
        { planId: "default" },
        { headers: { "Idempotency-Key": idempotencyKey } }
      );
      await updateStep(STEPS.TRIAL_START);
      setSuccess(true);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to start trial");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <OnboardingHeader />
      <Text style={styles.title}>Start Your Free Trial</Text>
      <Text style={styles.subtitle}>Full access for 14 days. Cancel anytime.</Text>

      <View style={styles.disclosure}>
        <Text style={styles.disclosureTitle}>Trial disclosure</Text>
        <Text style={styles.disclosureText}>You won’t be charged until your trial ends.</Text>
        <Text style={styles.disclosureText}>Renewal amount/date are shown before checkout.</Text>
      </View>

      {!!success ? <Text style={styles.success}>Trial started successfully.</Text> : null}
      {!!error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={[styles.button, loading && styles.buttonDisabled]} disabled={loading} onPress={startTrial}>
        <Text style={styles.buttonText}>{loading ? "Starting..." : "Start Free Trial"}</Text>
      </Pressable>

      <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("GoLiveChecklist")}>
        <Text style={styles.secondaryText}>Continue</Text>
      </Pressable>

      {!!error ? (
        <Pressable style={styles.retryBtn} onPress={startTrial}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "900", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#4b5563", marginBottom: 18 },
  disclosure: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 14, marginBottom: 14 },
  disclosureTitle: { fontWeight: "800", marginBottom: 6 },
  disclosureText: { color: "#4b5563", fontSize: 13, marginBottom: 3 },
  button: {
    backgroundColor: "#000",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontWeight: "900" },
  secondaryBtn: { marginTop: 10, alignItems: "center", padding: 10 },
  secondaryText: { color: "#111827", fontWeight: "700", textDecorationLine: "underline" },
  retryBtn: { marginTop: 8, alignItems: "center" },
  retryText: { color: "#111827", fontWeight: "800" },
  success: { color: "#065f46", fontWeight: "700", marginBottom: 10 },
  error: { color: "#b00020", fontWeight: "700", marginBottom: 10 },
});
