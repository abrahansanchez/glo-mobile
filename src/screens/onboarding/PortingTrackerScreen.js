import React, { useContext, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import api from "../../config/api";
import OnboardingHeader from "../../onboarding/OnboardingHeader";

const STATUS_ORDER = ["draft", "submitted", "carrier_review", "approved", "completed", "rejected"];

export default function PortingTrackerScreen({ navigation }) {
  const { setLocalStep } = useContext(OnboardingContext);
  const [status, setStatus] = useState("draft");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStatus() {
    setLoading(true);
    setError("");
    try {
      await setLocalStep("porting_tracker");
      const response = await api.get("/phone/porting/status");
      const payload = response.data || {};
      setStatus(payload.status || "draft");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load port status");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <View style={styles.container}>
      <OnboardingHeader />
      <Text style={styles.title}>Porting Status</Text>
      <Text style={styles.subtitle}>Current status: {status}</Text>

      <View style={styles.timeline}>
        {STATUS_ORDER.map((item) => {
          const done = STATUS_ORDER.indexOf(item) <= STATUS_ORDER.indexOf(status) && status !== "rejected";
          const rejected = status === "rejected" && item === "rejected";
          return (
            <View key={item} style={[styles.stage, done && styles.stageDone, rejected && styles.stageRejected]}>
              <Text style={[styles.stageText, done && styles.stageTextDone]}>{item}</Text>
            </View>
          );
        })}
      </View>

      {!!error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primaryBtn} onPress={loadStatus}>
        <Text style={styles.primaryText}>{loading ? "Refreshing..." : "Refresh Status"}</Text>
      </Pressable>

      <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("TrialStart")}>
        <Text style={styles.secondaryText}>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#fff", justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "900", marginBottom: 8 },
  subtitle: { color: "#4b5563", marginBottom: 14 },
  timeline: { gap: 8, marginBottom: 14 },
  stage: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  stageDone: { backgroundColor: "#ecfdf5", borderColor: "#34d399" },
  stageRejected: { backgroundColor: "#fef2f2", borderColor: "#f87171" },
  stageText: { fontWeight: "700", color: "#374151", textTransform: "capitalize" },
  stageTextDone: { color: "#065f46" },
  primaryBtn: {
    backgroundColor: "#000",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  primaryText: { color: "#fff", fontWeight: "900" },
  secondaryBtn: { marginTop: 10, alignItems: "center", padding: 10 },
  secondaryText: { textDecorationLine: "underline", fontWeight: "700" },
  error: { color: "#b00020", fontWeight: "700", marginBottom: 8 },
});
