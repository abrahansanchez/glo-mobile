import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Linking, ScrollView, RefreshControl } from "react-native";
import api from "../../config/api";
import OnboardingHeader from "../../onboarding/OnboardingHeader";
import { useFocusEffect } from "@react-navigation/native";
import AppCard from "../../components/ui/AppCard";
import AppText from "../../components/ui/AppText";
import AppBadge from "../../components/ui/AppBadge";
import AppButton from "../../components/ui/AppButton";
import { colors, spacing } from "../../ui/tokens";
import { track } from "../../analytics/track";

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
  const previousStatusRef = useRef(null);

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

  useEffect(() => {
    if (!status) return;
    if (previousStatusRef.current === status) return;
    previousStatusRef.current = status;
    track("porting_status_updated", {
      step: "porting_status",
      status,
      portingId: portingId || routePortingId || null,
    });
  }, [status, portingId, routePortingId]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} />}
    >
      <OnboardingHeader />
      <AppText variant="title" style={styles.title}>Porting Status</AppText>
      <AppBadge
        label={String(status).toUpperCase()}
        tone={status === "completed" || status === "approved" ? "success" : status === "rejected" ? "warning" : "neutral"}
        style={styles.statusBadge}
      />
      <AppText variant="body" style={styles.note}>Usually 3-10 business days depending on carrier response times.</AppText>

      <AppCard style={styles.metaCard}>
        <AppText variant="caption" style={styles.metaText}>Submitted: {formatDate(statusPayload?.submittedAt)}</AppText>
        <AppText variant="caption" style={styles.metaText}>Updated: {formatDate(statusPayload?.updatedAt)}</AppText>
        <AppText variant="caption" style={styles.metaText}>LOA: {loaUploaded ? "Uploaded" : "Missing"}</AppText>
        <AppText variant="caption" style={styles.metaText}>Bill: {billUploaded ? "Uploaded" : "Missing"}</AppText>
      </AppCard>

      <View style={styles.timeline}>
        {STATUS_STEPS.map((step, idx) => {
          const done = currentIndex >= 0 && idx <= currentIndex && status !== "rejected";
          const rejectedStep = status === "rejected" && step.key === "rejected";
          return (
            <View
              key={step.key}
              style={[styles.stage, done && styles.stageDone, rejectedStep && styles.stageRejected]}
            >
              <AppText style={[styles.stageText, done && styles.stageTextDone]}>{step.label}</AppText>
            </View>
          );
        })}
      </View>

      {!!rejectionReason && status === "rejected" ? (
        <AppCard style={styles.rejectCard}>
          <AppText style={styles.rejectTitle}>Action Needed: Port Request Rejected</AppText>
          <AppText style={styles.rejectText}>{rejectionReason}</AppText>
        </AppCard>
      ) : null}

      {blockers.length ? (
        <AppCard style={styles.blockersCard}>
          <AppText style={styles.blockersTitle}>Blockers</AppText>
          {blockers.map((item, idx) => (
            <AppText key={`${idx}-${item}`} style={styles.blockersItem}>
              • {String(item)}
            </AppText>
          ))}
        </AppCard>
      ) : null}

      {!!error ? <AppText style={styles.error}>{error}</AppText> : null}

      <AppButton
        label={loading ? "Refreshing..." : "Refresh"}
        onPress={loadStatus}
        variant="primary"
        style={styles.primaryBtn}
      />

      <AppButton
        label="Upload documents"
        onPress={() => navigation.navigate("PortingDocuments", { portingId })}
        variant="secondary"
        style={styles.secondaryBtn}
      />

      {status === "rejected" ? (
        <>
          <AppButton
            label="Fix & Resubmit"
            variant="secondary"
            style={styles.secondaryBtn}
            onPress={() =>
              navigation.navigate("PortingForm", {
                prefill: statusPayload?.details || statusPayload?.request || statusPayload || {},
              })
            }
          />

          <AppButton
            label="Re-upload Documents"
            variant="secondary"
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate("PortingDocuments", { portingId })}
          />

          <AppButton
            label="Contact support"
            variant="secondary"
            style={styles.secondaryBtn}
            onPress={() => Linking.openURL("mailto:support@gloai.com")}
          />
        </>
      ) : null}

      <AppButton
        label="Back to dashboard"
        variant="secondary"
        style={styles.secondaryBtn}
        onPress={() => navigation.navigate("DashboardTabs")}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24, justifyContent: "center" },
  title: { marginBottom: spacing.xs },
  statusBadge: { marginBottom: spacing.xs },
  note: { color: colors.textMuted, marginBottom: spacing.md },
  metaCard: { marginBottom: spacing.md, padding: spacing.md },
  metaText: { color: colors.textSecondary, marginBottom: spacing.xs },
  timeline: { gap: spacing.sm, marginBottom: spacing.md },
  stage: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  stageDone: { backgroundColor: "#ecfdf5", borderColor: "#10b981" },
  stageRejected: { backgroundColor: "#fef2f2", borderColor: "#ef4444" },
  stageText: { fontWeight: "700", color: "#374151" },
  stageTextDone: { color: "#065f46" },
  rejectCard: {
    borderWidth: 2,
    borderColor: "#dc2626",
    marginBottom: spacing.sm,
    backgroundColor: "#fff1f2",
  },
  rejectTitle: { fontWeight: "900", color: "#7f1d1d", marginBottom: spacing.xs, fontSize: 15 },
  rejectText: { color: "#7f1d1d", fontWeight: "700" },
  blockersCard: {
    borderWidth: 1,
    borderColor: "#fbbf24",
    marginBottom: spacing.sm,
    backgroundColor: "#fffbeb",
  },
  blockersTitle: { fontWeight: "800", color: "#92400e", marginBottom: spacing.xs },
  blockersItem: { color: "#78350f" },
  primaryBtn: { marginTop: spacing.xs },
  secondaryBtn: { marginTop: spacing.sm },
  error: { color: colors.danger, fontWeight: "700", marginBottom: spacing.sm },
});
