import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, Linking, ScrollView, RefreshControl } from "react-native";
import api from "../../config/api";
import OnboardingHeader from "../../onboarding/OnboardingHeader";
import { useFocusEffect } from "@react-navigation/native";

const STATUS_STEPS = [
  { key: "draft", label: "Draft" },
  { key: "submitted", label: "Submitted" },
  { key: "carrier_review", label: "Carrier review" },
  { key: "approved", label: "Approved" },
  { key: "completed", label: "Completed" },
  { key: "rejected", label: "Rejected" },
];

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function PortingStatusScreen({ navigation, route }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusPayload, setStatusPayload] = useState(null);
  const [error, setError] = useState("");
  const routePortingId = route?.params?.portingId || null;
  const seededStatusPayload = route?.params?.seededStatusPayload || null;
  const resubmittedAt = route?.params?.resubmittedAt || null;

  const status = statusPayload?.status || "draft";
  const rejectionReason = statusPayload?.rejectionReason || statusPayload?.reason || "";
  const blockers = Array.isArray(statusPayload?.blockers) ? statusPayload.blockers : [];

  const currentIndex = useMemo(
    () => STATUS_STEPS.findIndex((s) => s.key === status),
    [status]
  );

  async function loadStatus() {
    setLoading((prev) => (refreshing ? prev : true));
    setError("");
    try {
      const response = await api.get("/phone/porting/status", {
        params: routePortingId ? { id: routePortingId } : undefined,
      });
      setStatusPayload(response.data || {});
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load port status");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (!seededStatusPayload) return;
    setStatusPayload((prev) => ({ ...(prev || {}), ...seededStatusPayload }));
  }, [seededStatusPayload]);

  useFocusEffect(
    React.useCallback(() => {
      loadStatus();
    }, [])
  );

  useEffect(() => {
    const shouldPoll = status === "submitted" || status === "carrier_review";
    if (!shouldPoll) return undefined;

    const timer = setInterval(() => {
      loadStatus();
    }, 30000);

    return () => clearInterval(timer);
  }, [status, routePortingId]);

  useEffect(() => {
    if (!resubmittedAt) return;
    loadStatus();
  }, [resubmittedAt, routePortingId]);

  async function onPullRefresh() {
    setRefreshing(true);
    await loadStatus();
    setRefreshing(false);
  }

  const docs = statusPayload?.documents || {};
  const loaUploaded = Boolean(docs?.loa || statusPayload?.loaUploaded || statusPayload?.loaUrl);
  const billUploaded = Boolean(docs?.bill || statusPayload?.billUploaded || statusPayload?.billUrl);
  const portingId = statusPayload?.portingId || statusPayload?.id || statusPayload?._id || null;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} />}
    >
      <OnboardingHeader />
      <Text style={styles.title}>Porting Status</Text>
      <Text style={styles.subtitle}>Current status: {status}</Text>
      <Text style={styles.note}>Usually 3-10 business days depending on carrier response times.</Text>

      <View style={styles.metaCard}>
        <Text style={styles.metaText}>Submitted: {formatDate(statusPayload?.submittedAt)}</Text>
        <Text style={styles.metaText}>Updated: {formatDate(statusPayload?.updatedAt)}</Text>
        <Text style={styles.metaText}>LOA: {loaUploaded ? "Uploaded" : "Missing"}</Text>
        <Text style={styles.metaText}>Bill: {billUploaded ? "Uploaded" : "Missing"}</Text>
      </View>

      <View style={styles.timeline}>
        {STATUS_STEPS.map((step, idx) => {
          const done = currentIndex >= 0 && idx <= currentIndex && status !== "rejected";
          const rejectedStep = status === "rejected" && step.key === "rejected";
          return (
            <View
              key={step.key}
              style={[styles.stage, done && styles.stageDone, rejectedStep && styles.stageRejected]}
            >
              <Text style={[styles.stageText, done && styles.stageTextDone]}>{step.label}</Text>
            </View>
          );
        })}
      </View>

      {!!rejectionReason && status === "rejected" ? (
        <View style={styles.rejectCard}>
          <Text style={styles.rejectTitle}>Action Needed: Port Request Rejected</Text>
          <Text style={styles.rejectText}>{rejectionReason}</Text>
        </View>
      ) : null}

      {blockers.length ? (
        <View style={styles.blockersCard}>
          <Text style={styles.blockersTitle}>Blockers</Text>
          {blockers.map((item, idx) => (
            <Text key={`${idx}-${item}`} style={styles.blockersItem}>
              • {String(item)}
            </Text>
          ))}
        </View>
      ) : null}

      {!!error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.primaryBtn} onPress={loadStatus}>
        <Text style={styles.primaryText}>{loading ? "Refreshing..." : "Refresh"}</Text>
      </Pressable>

      <Pressable
        style={styles.secondaryBtn}
        onPress={() => navigation.navigate("PortingDocuments", { portingId })}
      >
        <Text style={styles.secondaryText}>Upload documents</Text>
      </Pressable>

      {status === "rejected" ? (
        <>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() =>
              navigation.navigate("PortingForm", {
                prefill: statusPayload?.details || statusPayload?.request || statusPayload || {},
              })
            }
          >
            <Text style={styles.secondaryText}>Fix & Resubmit</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate("PortingDocuments", { portingId })}
          >
            <Text style={styles.secondaryText}>Re-upload Documents</Text>
          </Pressable>

          <Pressable style={styles.secondaryBtn} onPress={() => Linking.openURL("mailto:support@gloai.com")}>
            <Text style={styles.secondaryText}>Contact support</Text>
          </Pressable>
        </>
      ) : null}

      <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("DashboardTabs")}>
        <Text style={styles.secondaryText}>Back to dashboard</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "900", marginBottom: 6 },
  subtitle: { color: "#4b5563", marginBottom: 12 },
  note: { color: "#6b7280", marginBottom: 12 },
  metaCard: { padding: 10, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, marginBottom: 12 },
  metaText: { color: "#374151", fontSize: 12, marginBottom: 4 },
  timeline: { gap: 8, marginBottom: 12 },
  stage: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  stageDone: { backgroundColor: "#ecfdf5", borderColor: "#10b981" },
  stageRejected: { backgroundColor: "#fef2f2", borderColor: "#ef4444" },
  stageText: { fontWeight: "700", color: "#374151" },
  stageTextDone: { color: "#065f46" },
  rejectCard: {
    padding: 12,
    borderWidth: 2,
    borderColor: "#dc2626",
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#fff1f2",
  },
  rejectTitle: { fontWeight: "900", color: "#7f1d1d", marginBottom: 4, fontSize: 15 },
  rejectText: { color: "#7f1d1d", fontWeight: "700" },
  blockersCard: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#fbbf24",
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#fffbeb",
  },
  blockersTitle: { fontWeight: "800", color: "#92400e", marginBottom: 4 },
  blockersItem: { color: "#78350f" },
  primaryBtn: { backgroundColor: "#000", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  primaryText: { color: "#fff", fontWeight: "900" },
  secondaryBtn: { alignItems: "center", marginTop: 10, padding: 10 },
  secondaryText: { textDecorationLine: "underline", fontWeight: "700", color: "#111827" },
  error: { color: "#b00020", fontWeight: "700", marginBottom: 8 },
});
