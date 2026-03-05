import { useEffect, useState, useContext } from "react";
import { View, StyleSheet, Pressable } from "react-native";

import { useNavigation } from "@react-navigation/native";

import { AuthContext } from "../auth/authContext";
import { OnboardingContext } from "../onboarding/OnboardingContext";

import api from "../config/api";
import StatCard from "../components/StatCard";
import LoadingState from "../components/LoadingState";
import ScreenContainer from "../components/layout/ScreenContainer";
import AppCard from "../components/ui/AppCard";
import AppBadge from "../components/ui/AppBadge";
import AppText from "../components/ui/AppText";
import EmptyState from "../components/ui/EmptyState";
import { colors, spacing } from "../ui/tokens";

export default function DashboardOverviewScreen() {
  const navigation = useNavigation();
  const { authenticated, barber, subscriptionStatus, logout, setSubscriptionStatus } = useContext(AuthContext);
  const { reset: restartOnboarding } = useContext(OnboardingContext);
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
      <AppText variant="title" style={styles.title}>Overview</AppText>
      <AppBadge label="Home" style={styles.badge} />
      {/* ===== DEV CONTROLS ===== */}
      <View style={{ marginBottom: 16, gap: 10 }}>
        <Pressable
          onPress={async () => {
            await restartOnboarding();
          }}
          style={styles.devPrimary}
        >
          <AppText style={styles.devPrimaryText}>Restart Onboarding (Dev)</AppText>
        </Pressable>

        <Pressable
          onPress={async () => {
            await logout();
          }}
          style={styles.devSecondary}
        >
          <AppText style={styles.devSecondaryText}>Log Out</AppText>
        </Pressable>
      </View>

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

      {/* ===== UPCOMING APPOINTMENTS ===== */}
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
            <AppText style={styles.meta}>{new Date(getAppointmentDate(appt)).toLocaleString()}</AppText>
            <View style={styles.tapRow}>
              <AppText variant="caption" style={styles.tapHint}>Tap to view details</AppText>
              <AppText style={styles.chevron}>›</AppText>
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
    color: colors.textSecondary,
  },
  error: {
    color: colors.danger,
  },
  devPrimary: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#111",
    alignItems: "center",
  },
  devPrimaryText: { color: "#fff", fontWeight: "800" },
  devSecondary: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#eee",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  devSecondaryText: { color: "#000", fontWeight: "800" },
  tapHint: {
    color: colors.textMuted,
    fontWeight: "600",
  },
  tapRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: "700",
  },
});
