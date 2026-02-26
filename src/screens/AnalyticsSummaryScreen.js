import { View, Text, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import api from "../config/api";
import StatCard from "../components/StatCard";
import LoadingState from "../components/LoadingState";
import ScreenContainer from "../components/layout/ScreenContainer";

export default function AnalyticsSummaryScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/analytics/overview");
      setAnalytics(res.data);
    } catch (err) {
      console.log(
        "Analytics load error:",
        err?.response?.data || err.message
      );
      setError("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingState label="Loading analytics..." />
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

  const totalCalls = analytics?.totalCalls ?? 0;
  const aiHandled = analytics?.aiHandled ?? 0;
  const missed = analytics?.missed ?? 0;
  const booked = analytics?.appointmentsBooked ?? 0;

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.title}>Analytics</Text>

        <View style={styles.row}>
          <StatCard label="Total Calls" value={String(totalCalls)} />
          <StatCard label="AI Handled" value={String(aiHandled)} />
        </View>

        <View style={styles.row}>
          <StatCard label="Missed Calls" value={String(missed)} />
          <StatCard label="Booked" value={String(booked)} />
        </View>
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
  error: {
    padding: 20,
    color: "red",
  },
});
