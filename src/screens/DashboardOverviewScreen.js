import { useEffect, useState, useContext } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

import { useNavigation } from "@react-navigation/native";

import { AuthContext } from "../auth/authContext";
import { OnboardingContext } from "../onboarding/OnboardingContext";

import api from "../config/api";
import StatCard from "../components/StatCard";
import LoadingState from "../components/LoadingState";
import ScreenContainer from "../components/layout/ScreenContainer";

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
        <Text style={styles.error}>{error}</Text>
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
    navigation.navigate("Appointments", {
      focusDate,
      focusAppointmentId,
      focusRequestAt: Date.now(),
    });
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
      <Text style={styles.title}>Overview</Text>
      {/* ===== DEV CONTROLS ===== */}
      <View style={{ marginBottom: 16, gap: 10 }}>
        <Pressable
          onPress={async () => {
            await restartOnboarding();
          }}
          style={styles.devPrimary}
        >
          <Text style={styles.devPrimaryText}>Restart Onboarding (Dev)</Text>
        </Pressable>

        <Pressable
          onPress={async () => {
            await logout();
          }}
          style={styles.devSecondary}
        >
          <Text style={styles.devSecondaryText}>Log Out</Text>
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
      <Text style={styles.sectionTitle}>Upcoming Appointments</Text>

      {appointments.length === 0 ? (
        <Text style={styles.empty}>No upcoming appointments</Text>
      ) : (
        appointments.slice(0, 3).map((appt) => (
          <Pressable key={appt._id} style={styles.apptCard} onPress={() => handleAppointmentPress(appt)}>
            <Text style={styles.client}>{appt.clientName || "Client"}</Text>
            <Text style={styles.meta}>{new Date(getAppointmentDate(appt)).toLocaleString()}</Text>
            <Text style={styles.tapHint}>Tap to view</Text>
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
  title: {
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 18,
  },
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
  apptCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  client: {
    fontSize: 15,
    fontWeight: "600",
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    color: "#666",
  },
  empty: {
    color: "#777",
    fontSize: 14,
    marginTop: 8,
  },
  error: {
    padding: 20,
    color: "red",
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
    marginTop: 8,
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "600",
  },
});
