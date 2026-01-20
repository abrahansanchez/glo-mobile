import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import { useNavigation } from "@react-navigation/native";

import api from "../config/api";
import StatCard from "../components/StatCard";
import LoadingState from "../components/LoadingState";

export default function DashboardOverviewScreen() {
  const navigation = useNavigation(); // ✅ added
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState(null);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    loadOverview();
  }, []);

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
      setError("Failed to load dashboard");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingState label="Loading overview..." />;
  if (error) return <Text style={styles.error}>{error}</Text>;

  const totalCalls = overview?.todayCalls ?? 0;
  const aiHandled = overview?.aiHandled ?? 0;
  const aiPct =
    totalCalls > 0 ? Math.round((aiHandled / totalCalls) * 100) : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Overview</Text>

      {/* ===== TEMP TEST BUTTON (SAFE) ===== */}
      <View style={{ marginBottom: 20 }}>
        <Button
          title="Simulate Incoming Call"
          onPress={() =>
            navigation.navigate("IncomingCall", {
              caller: "+1 (555) 123-4567",
            })
          }
        />
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
          <View key={appt._id} style={styles.apptCard}>
            <Text style={styles.client}>
              {appt.clientName || "Client"}
            </Text>
            <Text style={styles.meta}>
              {new Date(appt.date).toLocaleString()}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
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
});
