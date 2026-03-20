import { useEffect, useState, useContext } from "react";
import { View, StyleSheet, Pressable } from "react-native";

import { useNavigation } from "@react-navigation/native";

import { AuthContext } from "../auth/authContext";

import api from "../config/api";
import StatCard from "../components/StatCard";
import LoadingState from "../components/LoadingState";
import ScreenContainer from "../components/layout/ScreenContainer";
import AppCard from "../components/ui/AppCard";
import AppBadge from "../components/ui/AppBadge";
import AppText from "../components/ui/AppText";
import EmptyState from "../components/ui/EmptyState";
import { spacing } from "../ui/tokens";
import { useTheme } from "../theme/ThemeContext";

function SetupChecklist({ colors }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/onboarding/status").then((r) => {
      setStatus(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading || !status) return null;

  const barberName = status.barberName || status.preferredLanguage;
  const hasName = Boolean(status.barberName);
  const hasNumber = Boolean(status.numberStrategy && status.subscriptionStatus !== "incomplete");
  const hasTrial = status.subscriptionStatus === "trialing" || status.subscriptionStatus === "active";

  if (hasName && hasNumber && hasTrial) return null;

  const items = [
    { label: "Name added", done: hasName },
    { label: "Number active", done: hasNumber },
    { label: "Trial started", done: hasTrial },
    { label: "Business hours", done: false, action: true },
    { label: "Services & pricing", done: false, action: true },
  ];

  const doneCount = items.filter((item) => item.done).length;

  return (
    <View style={{ backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 0.5, borderColor: "rgba(255,255,255,0.07)", borderRadius: 12, padding: 12, marginBottom: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <AppText style={{ fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.5 }}>Finish setup</AppText>
        <AppText style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{doneCount} of 5</AppText>
      </View>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 3 }}>
          <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 0.5, borderColor: item.done ? "rgba(210,235,255,0.4)" : "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
            {item.done && <AppText style={{ fontSize: 8, color: "rgba(210,235,255,0.8)" }}>✓</AppText>}
          </View>
          <AppText style={{ fontSize: 11, color: item.done ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)", textDecorationLine: item.done ? "line-through" : "none" }}>{item.label}</AppText>
          {!item.done && item.action && <AppText style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", marginLeft: "auto" }}>›</AppText>}
        </View>
      ))}
    </View>
  );
}

export default function DashboardOverviewScreen() {
  const navigation = useNavigation();
  const { colors: themeColors } = useTheme();
  const { authenticated, barber, subscriptionStatus, setSubscriptionStatus } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState(null);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    // Guard: do not load if not authenticated, missing barber, or subscription required
    if (!authenticated) {
      console.log("[DashboardOverviewScreen] skipping load — not authenticated");
      return;
    }
    if (!barber?.id && !barber?._id) {
      console.log("[DashboardOverviewScreen] skipping load — missing barber");
      return;
    }
    if (subscriptionStatus === "required") {
      console.log("[DashboardOverviewScreen] skipping load — subscription required");
      return;
    }

    // Double-check auth header exists
    const authHeader = api.defaults.headers.common.Authorization;
    if (!authHeader) {
      console.log("[DashboardOverviewScreen] skipping load — missing auth header");
      return;
    }

    loadOverview();
  }, [authenticated, barber, subscriptionStatus]);

  async function loadOverview() {
    try {
      setLoading(true);
      setError("");

      // 1️⃣ Dashboard stats
      const overviewRes = await api.get("/dashboard/overview");

      // 2️⃣ Upcoming appointments
      const apptRes = await api.get("/appointments/upcoming");

      // ✅ FORCE appointments into an array
      const apptList = Array.isArray(apptRes.data)
        ? apptRes.data
        : apptRes.data?.appointments || [];

      setOverview(overviewRes.data);
      setAppointments(apptList);
    } catch (err) {
      console.log(
        "Overview load error:",
        err?.response?.data || err.message
      );
      const code = err?.response?.data?.code || err?.response?.data?.error;
      if (
        code === "SUBSCRIPTION_REQUIRED" ||
        code === "SUBSCRIPTION_PAST_DUE" ||
        code === "INCOMPLETE"
      ) {
        // Inform app that subscription is required; AppNavigator will route.
        try {
          setSubscriptionStatus("required");
        } catch (e) {}
      } else {
        setError("Failed to load dashboard");
      }
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingState label="Loading overview..." />
      </ScreenContainer>
    );
  }
  if (error) {
    return (
      <ScreenContainer>
        <AppCard>
          <AppText variant="section" style={styles.error}>{error}</AppText>
        </AppCard>
      </ScreenContainer>
    );
  }

  const totalCalls = overview?.todayCalls ?? 0;
  const aiHandled = overview?.aiHandled ?? 0;
  const aiPct =
    totalCalls > 0 ? Math.round((aiHandled / totalCalls) * 100) : 0;

  function getAppointmentDate(appointment) {
    return (
      appointment?.startAt ||
      appointment?.date ||
      appointment?.scheduledAt ||
      appointment?.createdAt ||
      null
    );
  }

  function handleAppointmentPress(appointment) {
    const focusDate = getAppointmentDate(appointment);
    const focusAppointmentId = appointment?._id || null;

    // Overview lives in tabs, so this switches to Schedule tab and forwards focus params.
    navigation.navigate("Schedule", {
      focusDate,
      focusAppointmentId,
      initialView: "day",
      date: focusDate,
      focusRequestAt: Date.now(),
    });
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
      <SetupChecklist colors={themeColors} />
      <AppText variant="title" style={styles.title}>Overview</AppText>
      <AppBadge label="Home" style={styles.badge} />

      {/* ===== STATS ===== */}
      <View style={styles.row}>
        <StatCard label="Total Calls" value={String(totalCalls)} />
        <StatCard label="AI Handled" value={`${aiPct}%`} />
      </View>

      <View style={styles.row}>
        <StatCard
          label="Appointments"
          value={String(appointments.length)}
          sublabel="Upcoming"
        />
        <StatCard
          label="Missed Calls"
          value={String(overview?.missed ?? 0)}
        />
      </View>

      <AppText variant="section" style={styles.sectionTitle}>Upcoming Appointments</AppText>

      {appointments.length === 0 ? (
        <EmptyState
          title="No upcoming appointments"
          message="New bookings will appear here."
        />
      ) : (
        appointments.slice(0, 3).map((appt) => (
          <Pressable key={appt._id} onPress={() => handleAppointmentPress(appt)}>
            <AppCard style={styles.apptCard}>
            <AppText style={styles.client}>{appt.clientName || "Client"}</AppText>
            <AppText style={[styles.meta, { color: themeColors.textSecondary }]}>
              {new Date(getAppointmentDate(appt)).toLocaleString()}
            </AppText>
            <View style={styles.tapRow}>
              <AppText variant="caption" style={[styles.tapHint, { color: themeColors.textMuted }]}>View details</AppText>
              <AppText style={[styles.chevron, { color: themeColors.textMuted }]}>›</AppText>
            </View>
            </AppCard>
          </Pressable>
        ))
      )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: { marginBottom: spacing.xs },
  badge: { marginBottom: spacing.md },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: "700",
  },
  apptCard: { marginBottom: spacing.sm },
  client: {
    fontSize: 15,
    fontWeight: "600",
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
  },
  error: {
    color: "#b00020",
  },
  tapHint: {
    fontWeight: "600",
  },
  tapRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chevron: {
    fontSize: 18,
    fontWeight: "700",
  },
});
