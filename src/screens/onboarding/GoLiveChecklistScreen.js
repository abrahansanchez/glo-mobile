import React, { useContext, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import api from "../../config/api";
import OnboardingHeader from "../../onboarding/OnboardingHeader";

export default function GoLiveChecklistScreen() {
  const { setLocalStep, markComplete } = useContext(OnboardingContext);
  const [ready, setReady] = useState(false);
  const [readiness, setReadiness] = useState({});
  const [blockers, setBlockers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadChecklist() {
    setLoading(true);
    setError("");
    try {
      await setLocalStep("go_live_checklist");
      const response = await api.get("/launch/checklist");
      const payload = response.data || {};
      setReadiness(payload.readiness || payload.checklist || {});
      setBlockers(Array.isArray(payload.blockers) ? payload.blockers : []);
      setReady(Boolean(payload.launchReady));
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load checklist");
      setReady(false);
      setReadiness({});
      setBlockers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChecklist();
  }, []);

  async function handleGoLive() {
    await markComplete();
  }

  const checklistItems = Object.entries(readiness);

  return (
    <View style={styles.container}>
      <OnboardingHeader />
      <Text style={styles.title}>You’re Almost Live</Text>
      <Text style={styles.subtitle}>{ready ? "All systems ready." : "Complete these items to go live."}</Text>

      {checklistItems.length === 0 && !loading ? (
        <Text style={styles.empty}>Checklist unavailable right now.</Text>
      ) : (
        checklistItems.map(([key, value]) => (
          <View key={key} style={styles.row}>
            <Text style={styles.rowLabel}>{key}</Text>
            <Text style={[styles.rowValue, value ? styles.ok : styles.notOk]}>{value ? "Ready" : "Pending"}</Text>
          </View>
        ))
      )}

      {!!error ? <Text style={styles.error}>{error}</Text> : null}
      {blockers.length > 0 ? (
        <View style={styles.blockers}>
          <Text style={styles.blockerTitle}>Blockers</Text>
          {blockers.map((b, idx) => (
            <Text key={`bl-${idx}`} style={styles.blockerText}>
              • {b}
            </Text>
          ))}
        </View>
      ) : null}

      <Pressable style={styles.secondaryBtn} onPress={loadChecklist}>
        <Text style={styles.secondaryText}>{loading ? "Refreshing..." : "Refresh Checklist"}</Text>
      </Pressable>

      <Pressable style={[styles.primaryBtn, !ready && styles.primaryDisabled]} onPress={handleGoLive} disabled={!ready}>
        <Text style={styles.primaryText}>Enter Dashboard</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "900", marginBottom: 6 },
  subtitle: { color: "#4b5563", marginBottom: 14 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  rowLabel: { color: "#111827", fontWeight: "700" },
  rowValue: { fontWeight: "800" },
  ok: { color: "#065f46" },
  notOk: { color: "#92400e" },
  blockers: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
    borderRadius: 10,
    padding: 12,
  },
  blockerTitle: { fontWeight: "800", marginBottom: 4 },
  blockerText: { color: "#78350f" },
  primaryBtn: {
    marginTop: 14,
    backgroundColor: "#000",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryDisabled: { opacity: 0.5 },
  primaryText: { color: "#fff", fontWeight: "900" },
  secondaryBtn: { alignItems: "center", marginTop: 10, padding: 10 },
  secondaryText: { textDecorationLine: "underline", fontWeight: "700" },
  error: { color: "#b00020", fontWeight: "700", marginTop: 8 },
  empty: { color: "#6b7280", marginBottom: 8 },
});
