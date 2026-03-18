import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Linking, ScrollView, RefreshControl } from "react-native";
import api from "../../config/api";
import OnboardingHeader from "../../onboarding/OnboardingHeader";
import { useFocusEffect } from "@react-navigation/native";
import AppCard from "../../components/ui/AppCard";
import AppText from "../../components/ui/AppText";
import AppBadge from "../../components/ui/AppBadge";
import AppButton from "../../components/ui/AppButton";
import OnboardingHero from "../../components/onboarding/OnboardingHero";
import { spacing } from "../../ui/tokens";
import { track } from "../../analytics/track";
import { useTheme } from "../../theme/ThemeContext";

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
  const { colors, resolvedTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusPayload, setStatusPayload] = useState(null);
  const [error, setError] = useState("");
  const routePortingId = route?.params?.portingId || null;
  const seededStatusPayload = route?.params?.seededStatusPayload || null;
  const resubmittedAt = route?.params?.resubmittedAt || null;
  const previousStatusRef = useRef(null);

  function canNavigateTo(routeName) {
    const routeNames = navigation?.getState?.()?.routeNames || [];
    return routeNames.includes(routeName);
  }

  function goBackToDashboardSafely() {
    if (canNavigateTo("DashboardTabs")) {
      navigation.navigate("DashboardTabs");
      return;
    }
    if (canNavigateTo("Home")) {
      navigation.navigate("Home");
      return;
    }
    if (canNavigateTo("Settings")) {
      navigation.navigate("Settings");
      return;
    }
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    }
  }

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
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} />}
    >
      <OnboardingHeader />
      <OnboardingHero
        stepLabel="Step 8 of 10"
        title="Porting Status"
        subtitle="Track your transfer and resolve any issues quickly."
      />
      <AppBadge
        label={String(status).toUpperCase()}
        tone={status === "completed" || status === "approved" ? "success" : status === "rejected" ? "warning" : "neutral"}
        style={styles.statusBadge}
      />
      <AppText variant="body" style={[styles.note, { color: colors.textMuted }]}>Usually 3-10 business days depending on carrier response times.</AppText>

      <AppCard style={styles.metaCard}>
        <AppText variant="caption" style={[styles.metaText, { color: colors.textSecondary }]}>Submitted: {formatDate(statusPayload?.submittedAt)}</AppText>
        <AppText variant="caption" style={[styles.metaText, { color: colors.textSecondary }]}>Updated: {formatDate(statusPayload?.updatedAt)}</AppText>
        <AppText variant="caption" style={[styles.metaText, { color: colors.textSecondary }]}>LOA: {loaUploaded ? "Uploaded" : "Missing"}</AppText>
        <AppText variant="caption" style={[styles.metaText, { color: colors.textSecondary }]}>Bill: {billUploaded ? "Uploaded" : "Missing"}</AppText>
      </AppCard>

      <View style={styles.timeline}>
        {STATUS_STEPS.map((step, idx) => {
          const done = currentIndex >= 0 && idx <= currentIndex && status !== "rejected";
          const rejectedStep = status === "rejected" && step.key === "rejected";
          return (
            <View
              key={step.key}
              style={[
                styles.stage,
                { borderColor: colors.border, backgroundColor: colors.card },
                done && { borderColor: colors.success, backgroundColor: resolvedTheme === "dark" ? "#12382c" : "#ecfdf5" },
                rejectedStep && { borderColor: colors.danger, backgroundColor: resolvedTheme === "dark" ? "#3b1010" : "#fef2f2" },
              ]}
            >
              <AppText
                style={[
                  styles.stageText,
                  { color: colors.textSecondary },
                  done && { color: colors.success },
                  rejectedStep && { color: colors.danger },
                ]}
              >
                {step.label}
              </AppText>
            </View>
          );
        })}
      </View>

      {!!rejectionReason && status === "rejected" ? (
        <AppCard style={[styles.rejectCard, { borderColor: colors.danger, backgroundColor: resolvedTheme === "dark" ? "#3b1010" : "#fff1f2" }]}>
          <AppText style={[styles.rejectTitle, { color: colors.danger }]}>Action Needed: Port Request Rejected</AppText>
          <AppText style={[styles.rejectText, { color: colors.danger }]}>{rejectionReason}</AppText>
        </AppCard>
      ) : null}

      {blockers.length ? (
        <AppCard style={[styles.blockersCard, { borderColor: colors.warning, backgroundColor: resolvedTheme === "dark" ? "#3a2a14" : "#fffbeb" }]}>
          <AppText style={[styles.blockersTitle, { color: colors.warning }]}>Blockers</AppText>
          {blockers.map((item, idx) => (
            <AppText key={`${idx}-${item}`} style={[styles.blockersItem, { color: colors.warning }]}>
              • {String(item)}
            </AppText>
          ))}
        </AppCard>
      ) : null}

      {!!error ? <AppText style={[styles.error, { color: colors.danger }]}>{error}</AppText> : null}

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
        onPress={goBackToDashboardSafely}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  statusBadge: { marginBottom: spacing.xs },
  note: { marginBottom: spacing.md },
  metaCard: { marginBottom: spacing.md, padding: spacing.md },
  metaText: { marginBottom: spacing.xs },
  timeline: { gap: spacing.sm, marginBottom: spacing.md },
  stage: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  stageDone: {},
  stageRejected: {},
  stageText: { fontWeight: "700" },
  stageTextDone: {},
  rejectCard: {
    borderWidth: 2,
    marginBottom: spacing.sm,
  },
  rejectTitle: { fontWeight: "900", marginBottom: spacing.xs, fontSize: 15 },
  rejectText: { fontWeight: "700" },
  blockersCard: {
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  blockersTitle: { fontWeight: "800", marginBottom: spacing.xs },
  blockersItem: {},
  primaryBtn: { marginTop: spacing.xs },
  secondaryBtn: { marginTop: spacing.sm },
  error: { fontWeight: "700", marginBottom: spacing.sm },
});
