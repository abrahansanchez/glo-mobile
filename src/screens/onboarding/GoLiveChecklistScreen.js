import React, { useContext, useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import api from "../../config/api";
import OnboardingHeader from "../../onboarding/OnboardingHeader";
import { STEPS } from "../../onboarding/stepKeys";
import AppCard from "../../components/ui/AppCard";
import AppBadge from "../../components/ui/AppBadge";
import AppText from "../../components/ui/AppText";
import AppButton from "../../components/ui/AppButton";
import EmptyState from "../../components/ui/EmptyState";
import { colors, spacing } from "../../ui/tokens";

const BLOCKER_UI = {
  ONBOARDING_INCOMPLETE: {
    title: "Finish setup",
    description: "Complete your business setup to go live.",
    actionText: "Continue onboarding",
    action: "resumeOnboarding",
  },
  PORTING_SUBMITTED: {
    title: "Porting in progress",
    description: "Your carrier transfer is submitted. You can use the app while this completes.",
    actionText: "View port status",
    action: "goPortStatus",
  },
  PORTING_REQUIRED: {
    title: "Port your number",
    description: "Start porting to use your existing business number with Glo.",
    actionText: "Start porting",
    action: "startPorting",
  },
  PORTING_DOCS_REQUIRED: {
    title: "Upload required documents",
    description: "Upload your LOA and recent bill to continue porting.",
    actionText: "Upload documents",
    action: "uploadDocs",
  },
  PORTING_REJECTED: {
    title: "Porting needs changes",
    description: "Your carrier rejected the request. Fix details and resubmit.",
    actionText: "Fix & resubmit",
    action: "fixResubmit",
  },
};

const READINESS_EXCLUDE_KEYS = new Set([
  "readiness",
  "checks",
  "checklist",
  "blockers",
  "launchReady",
  "isReady",
  "status",
  "message",
  "error",
  "nextStep",
  "currentStep",
  "updatedAt",
]);

function mapStepToRoute(step) {
  switch (step) {
    case STEPS.ACCOUNT:
      return "Account";
    case STEPS.BUSINESS_SNAPSHOT:
      return "BusinessSnapshot";
    case STEPS.NUMBER_STRATEGY:
      return "NumberStrategy";
    case STEPS.TRIAL_START:
      return "TrialStart";
    case STEPS.WELCOME:
    default:
      return "Welcome";
  }
}

function normalizeReadiness(payload) {
  const sourceReadiness = payload?.readiness;
  const sourceChecks = payload?.checks;
  const sourceChecklist = payload?.checklist;

  let raw = null;
  if (sourceReadiness && typeof sourceReadiness === "object") raw = sourceReadiness;
  else if (sourceChecks && typeof sourceChecks === "object") raw = sourceChecks;
  else if (sourceChecklist && typeof sourceChecklist === "object") raw = sourceChecklist;
  else if (payload && typeof payload === "object") {
    raw = Object.fromEntries(
      Object.entries(payload).filter(([key, value]) => !READINESS_EXCLUDE_KEYS.has(key) && typeof value === "boolean")
    );
  } else {
    raw = {};
  }

  return Object.entries(raw)
    .filter(([, value]) => typeof value === "boolean")
    .map(([key, value]) => ({ key, value }));
}

function normalizeBlocker(rawBlocker) {
  if (typeof rawBlocker === "string") {
    const code = rawBlocker.toUpperCase();
    const ui = BLOCKER_UI[code] || null;
    return {
      code,
      title: ui?.title || "Action needed",
      message: ui?.description || rawBlocker,
      action: ui?.action || null,
      actionText: ui?.actionText || "Fix",
    };
  }

  if (rawBlocker && typeof rawBlocker === "object") {
    const code = String(rawBlocker.code || rawBlocker.type || rawBlocker.key || "UNKNOWN_BLOCKER").toUpperCase();
    const ui = BLOCKER_UI[code] || null;
    return {
      code,
      title: ui?.title || rawBlocker.title || "Action needed",
      message: ui?.description || rawBlocker.message || rawBlocker.reason || "Resolve this blocker to continue.",
      action: rawBlocker.action || ui?.action || null,
      actionText: rawBlocker.actionLabel || rawBlocker.buttonText || ui?.actionText || "Fix",
    };
  }

  return {
    code: "UNKNOWN_BLOCKER",
    title: "Action needed",
    message: "Resolve this blocker to continue.",
    action: null,
    actionText: "Fix",
  };
}

export default function GoLiveChecklistScreen({ navigation }) {
  const { setLocalStep, markComplete } = useContext(OnboardingContext);
  const [ready, setReady] = useState(false);
  const [readinessRows, setReadinessRows] = useState([]);
  const [blockers, setBlockers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const trialStarted = Boolean(readinessRows.find((row) => row.key === "trialStarted")?.value);

  function canNavigateTo(routeName) {
    const routeNames = navigation?.getState?.()?.routeNames || [];
    return routeNames.includes(routeName);
  }

  function navigateSafely(primaryRoute, fallbackRoute, alertTitle, alertMessage) {
    if (primaryRoute && canNavigateTo(primaryRoute)) {
      navigation.navigate(primaryRoute);
      return true;
    }
    if (fallbackRoute && canNavigateTo(fallbackRoute)) {
      navigation.navigate(fallbackRoute);
      return true;
    }
    Alert.alert(alertTitle || "Action unavailable", alertMessage || "This action is not available in this app build.");
    return false;
  }

  function getReadinessLabel(key) {
    const labels = {
      numberStrategySelected: "Number strategy",
      portingComplete: "Porting complete",
      trialStarted: "Trial started",
      calendarConnected: "Calendar connected",
      availabilitySet: "Availability set",
      testCallCompleted: "Verification call",
      documentsUploaded: "Porting documents",
    };
    return labels[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
  }

  function getReadinessHelper(key) {
    const helper = {
      numberStrategySelected: "Pick new number or port existing to continue.",
      portingComplete: "Complete number porting to remove this blocker.",
      trialStarted: "Start your trial to unlock go-live.",
      calendarConnected: "Connect your calendar to sync appointments.",
      availabilitySet: "Set business hours and available times.",
      testCallCompleted: "Run one verification call to confirm setup.",
      documentsUploaded: "Upload LOA and phone bill for porting.",
    };
    return helper[key] || "Resolve this item to continue go-live setup.";
  }

  function getBlockerAction(blockerCode) {
    const code = String(blockerCode || "").toUpperCase();
    if (code.includes("PORTING") && code.includes("DOC")) return "portingDocs";
    if (code.includes("PORTING")) return "porting";
    if (code.includes("NUMBER_STRATEGY")) return "numberStrategy";
    if (code.includes("TRIAL") || code.includes("SUBSCRIPTION")) return "trial";
    if (code.includes("CALENDAR")) return "calendar";
    if (code.includes("AVAILABILITY")) return "availability";
    if (code.includes("TEST_CALL")) return "testCall";
    return "settings";
  }

  async function loadChecklist() {
    console.log("[LAUNCH_CHECKLIST] fetching");
    setLoading((prev) => (refreshing ? prev : true));
    setError("");
    try {
      await setLocalStep("go_live_checklist");
      const response = await api.get("/launch/checklist");
      const payload = response.data || {};
      const nextReadinessRows = normalizeReadiness(payload);
      const nextBlockersRaw = Array.isArray(payload.blockers) ? payload.blockers : [];
      const nextBlockers = nextBlockersRaw.map(normalizeBlocker);
      const derivedReady =
        typeof payload.launchReady === "boolean"
          ? payload.launchReady
          : nextReadinessRows.length > 0 && nextReadinessRows.every((row) => row.value === true);
      setReadinessRows(nextReadinessRows);
      setBlockers(nextBlockers);
      setReady(Boolean(derivedReady));
      console.log(
        `[LAUNCH_CHECKLIST] loaded launchReady=${Boolean(derivedReady)} blockers=${nextBlockers
          .map((item) => item.code)
          .join(",") || "none"}`
      );
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load checklist");
      setReady(false);
      setReadinessRows([]);
      setBlockers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChecklist();
  }, []);

  async function handleGoLive() {
    if (!trialStarted) return;
    console.log("[NAV] GoToDashboard allowed trialStarted=true");
    await markComplete();
  }

  async function handleFinishSetup() {
    try {
      const response = await api.get("/onboarding/status");
      const payload = response.data || {};
      const nextStep = payload?.nextStep || payload?.currentStep || STEPS.WELCOME;
      console.log(`[ONBOARDING_RESUME] nextStep=${nextStep}`);
      navigation.navigate(mapStepToRoute(String(nextStep).toLowerCase()));
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to resume onboarding");
    }
  }

  async function handleBlockerAction(action) {
    const resolvedAction = action || "settings";
    const symbolicActions = new Set([
      "resumeOnboarding",
      "porting",
      "goPortStatus",
      "startPorting",
      "fixResubmit",
      "portingDocs",
      "uploadDocs",
      "numberStrategy",
      "trial",
      "calendar",
      "availability",
      "testCall",
      "settings",
    ]);

    if (!symbolicActions.has(resolvedAction) && canNavigateTo(resolvedAction)) {
      navigation.navigate(resolvedAction);
      return;
    }

    if (resolvedAction === "resumeOnboarding") {
      await handleFinishSetup();
      return;
    }
    if (resolvedAction === "porting" || resolvedAction === "goPortStatus" || resolvedAction === "startPorting" || resolvedAction === "fixResubmit") {
      navigateSafely(
        "PortingStatus",
        "PortingForm",
        "Porting setup",
        "Porting routes are unavailable in this build. Open Settings to continue setup."
      );
      return;
    }
    if (resolvedAction === "portingDocs" || resolvedAction === "uploadDocs") {
      navigateSafely(
        "PortingDocuments",
        "PortingStatus",
        "Documents upload",
        "Document upload route is unavailable in this build."
      );
      return;
    }
    if (resolvedAction === "numberStrategy") {
      navigateSafely(
        "NumberStrategy",
        "Settings",
        "Number strategy",
        "Number strategy route is unavailable in this build."
      );
      return;
    }
    if (resolvedAction === "trial") {
      navigateSafely("TrialStart", "Settings", "Trial setup", "Trial route is unavailable in this build.");
      return;
    }
    if (resolvedAction === "calendar") {
      navigateSafely(
        "CalendarConnect",
        "Settings",
        "Calendar setup",
        "Calendar connection route is unavailable in this build."
      );
      return;
    }
    if (resolvedAction === "availability") {
      navigateSafely("Availability", "Settings", "Availability setup", "Availability route is unavailable.");
      return;
    }
    if (resolvedAction === "testCall") {
      navigateSafely("TestCall", null, "Verification call required", "Please complete one verification call from your call setup flow.");
      return;
    }

    navigateSafely("Settings", null, "Action unavailable", "Open Settings to resolve this blocker.");
  }

  async function onPullRefresh() {
    setRefreshing(true);
    await loadChecklist();
    setRefreshing(false);
  }

  const checklistItems = readinessRows;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} />}
    >
      <OnboardingHeader />
      <AppText variant="title" style={styles.title}>You’re Almost Live</AppText>
      <AppText variant="body" style={styles.subtitle}>
        {ready ? "All systems ready." : "Complete these items to go live."}
      </AppText>
      <AppBadge label={ready ? "READY" : "ACTION REQUIRED"} tone={ready ? "success" : "warning"} style={styles.statusBadge} />

      {loading ? <AppText style={styles.loading}>Loading…</AppText> : null}

      {checklistItems.length === 0 && !loading ? (
        <EmptyState
          title="Checklist unavailable"
          message="Checklist unavailable right now."
        />
      ) : (
        checklistItems.map(({ key, value }) => (
          <AppCard key={key} style={[styles.row, value ? styles.rowReady : styles.rowPending]}>
            <View style={styles.rowLeft}>
              <AppText style={styles.rowLabel}>{getReadinessLabel(key)}</AppText>
              {!value ? <AppText variant="caption" style={styles.helperText}>{getReadinessHelper(key)}</AppText> : null}
            </View>
            <AppText style={[styles.rowValue, value ? styles.ok : styles.notOk]}>
              {value ? "✅ Ready" : "⏳ Not ready"}
            </AppText>
          </AppCard>
        ))
      )}

      {!!error ? <AppText style={styles.error}>{error}</AppText> : null}
      {blockers.length > 0 ? (
        <AppCard style={styles.blockers}>
          <AppText style={styles.blockerTitle}>Blockers</AppText>
          {blockers.map((blocker, idx) => {
            const action = blocker.action || getBlockerAction(blocker.code);
            return (
              <AppCard key={`bl-${idx}-${blocker.code}`} style={styles.blockerCard}>
                <AppText style={styles.blockerCardTitle}>{blocker.title}</AppText>
                <AppText style={styles.blockerText}>{blocker.message}</AppText>
                <AppButton
                  label={blocker.actionText || "Fix"}
                  variant="primary"
                  style={styles.blockerBtn}
                  onPress={() => handleBlockerAction(action)}
                />
              </AppCard>
            );
          })}
        </AppCard>
      ) : null}

      <AppButton
        label={loading ? "Refreshing..." : "Refresh Checklist"}
        variant="secondary"
        style={styles.secondaryBtn}
        onPress={loadChecklist}
      />

      <AppButton
        label={trialStarted ? "Go to Dashboard" : "Start trial to continue"}
        variant="primary"
        style={styles.primaryBtn}
        onPress={handleGoLive}
        disabled={!trialStarted}
      />

      <AppButton
        label="Finish Setup"
        variant="secondary"
        style={styles.secondaryBtn}
        onPress={handleFinishSetup}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#fff", padding: 24 },
  title: { marginBottom: spacing.xs },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.xs },
  statusBadge: { marginBottom: spacing.md },
  loading: { color: colors.textMuted, marginBottom: spacing.sm, fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  rowReady: { backgroundColor: "#f9fafb" },
  rowPending: { backgroundColor: "#fff" },
  rowLeft: { flex: 1, paddingRight: 8 },
  rowLabel: { color: colors.textPrimary, fontWeight: "700" },
  helperText: { color: colors.textMuted, marginTop: 2 },
  rowValue: { fontWeight: "800" },
  ok: { color: colors.success },
  notOk: { color: colors.warning },
  blockers: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
  },
  blockerTitle: { fontWeight: "800", marginBottom: spacing.xs },
  blockerText: { color: "#78350f", marginTop: 2 },
  blockerCard: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: "#f59e0b",
    backgroundColor: "#fff",
  },
  blockerCardTitle: { fontWeight: "800", color: "#78350f" },
  blockerBtn: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  primaryBtn: { marginTop: spacing.md },
  secondaryBtn: { marginTop: spacing.sm },
  error: { color: colors.danger, fontWeight: "700", marginTop: spacing.sm },
});
