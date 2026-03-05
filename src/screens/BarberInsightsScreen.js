import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import api from "../config/api";
import ScreenContainer from "../components/layout/ScreenContainer";
import LoadingState from "../components/LoadingState";
import AppText from "../components/ui/AppText";
import EmptyState from "../components/ui/EmptyState";
import MetricCard from "../components/MetricCard";
import { spacing } from "../ui/tokens";

function formatCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "--";
  return n.toLocaleString();
}

function formatSpeed(value) {
  if (value === null || value === undefined || value === "") return "Coming soon";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return `${Math.round(n)}s`;
}

function normalize(payload) {
  const root = payload || {};
  return {
    callsHandled: root?.aiHandled ?? root?.callsHandled ?? root?.calls?.handled ?? null,
    missedCalls: root?.missed ?? root?.callsMissed ?? root?.calls?.missed ?? null,
    bookingsCreated: root?.appointmentsBooked ?? root?.bookingsCreated ?? root?.bookings?.created ?? null,
    clientsContacted: root?.clientsContacted ?? root?.clients?.contacted ?? null,
    voicemailCount: root?.voicemailCount ?? root?.voicemails ?? root?.inbox?.voicemails ?? null,
    responseSpeed: root?.responseSpeedSeconds ?? root?.responseSpeed ?? null,
    revenue: root?.revenue ?? null,
  };
}

export default function BarberInsightsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  async function load() {
    try {
      setError("");
      const res = await api.get("/analytics/overview");
      setData(normalize(res?.data || {}));
    } catch (e) {
      setData(null);
      setError(e?.response?.data?.message || "Insights are temporarily unavailable.");
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const cards = useMemo(
    () => [
      { label: "Calls Handled", value: formatCount(data?.callsHandled) },
      { label: "Calls Missed", value: formatCount(data?.missedCalls) },
      { label: "Bookings Created", value: formatCount(data?.bookingsCreated) },
      { label: "Clients Contacted", value: formatCount(data?.clientsContacted) },
      { label: "Voicemail Count", value: formatCount(data?.voicemailCount) },
      { label: "Response Speed", value: formatSpeed(data?.responseSpeed) },
      { label: "Revenue", value: data?.revenue ? `$${Number(data.revenue).toLocaleString()}` : "Coming soon" },
    ],
    [data]
  );

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingState message="Loading insights..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <AppText variant="title" style={styles.title}>Insights</AppText>

        {!!error ? (
          <EmptyState title="Coming soon" message="Performance insights are being finalized for this account." />
        ) : null}

        <View style={styles.grid}>
          {cards.map((card) => (
            <MetricCard
              key={card.label}
              label={card.label}
              value={card.value}
              description={card.value === "Coming soon" ? "Coming soon" : undefined}
            />
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  title: { marginBottom: spacing.md },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});
