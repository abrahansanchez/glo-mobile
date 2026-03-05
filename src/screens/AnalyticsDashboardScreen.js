import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import api from "../config/api";
import ScreenContainer from "../components/layout/ScreenContainer";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/ui/EmptyState";
import AppCard from "../components/ui/AppCard";
import AppText from "../components/ui/AppText";
import MetricCard from "../components/MetricCard";
import { spacing } from "../ui/tokens";
import { useIsAdmin } from "../auth/adminAccess";
import { useTheme } from "../theme/ThemeContext";

const RANGE_OPTIONS = [7, 14, 30];

function normalizeKpiPayload(payload) {
  const root = payload?.kpis && typeof payload.kpis === "object" ? payload.kpis : payload || {};

  return {
    signups: root?.signups ?? root?.onboarding?.signups ?? 0,
    onboardingCompletionRate:
      root?.onboardingCompletionRate ?? root?.onboarding?.completionRate ?? root?.onboarding?.completionRatePct ?? 0,
    trialStarts: root?.trialStarts ?? root?.trial?.starts ?? 0,
    portSubmissions: root?.portSubmissions ?? root?.porting?.submissions ?? 0,
    d7Retention: root?.d7Retention ?? root?.retention?.d7 ?? 0,
    callsHandledFirst72h:
      root?.callsHandledFirst72h ?? root?.callsHandled72h ?? root?.calls?.handledFirst72h ?? root?.calls?.handledInFirst72h ?? 0,
  };
}

function formatCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString();
}

function formatPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0%";
  const pct = n <= 1 ? n * 100 : n;
  return `${Math.round(pct)}%`;
}

export default function AnalyticsDashboardScreen() {
  const { colors } = useTheme();
  const isAdmin = useIsAdmin();
  const [rangeDays, setRangeDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [kpis, setKpis] = useState(null);

  const loadKpis = useCallback(async (selectedRange = rangeDays) => {
    try {
      setError("");
      const response = await api.get("/analytics/kpis", {
        params: { rangeDays: selectedRange },
      });
      setKpis(normalizeKpiPayload(response?.data || {}));
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load KPIs");
    }
  }, [rangeDays]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadKpis(rangeDays);
      setLoading(false);
    })();
  }, [rangeDays, loadKpis]);

  async function onRefresh() {
    setRefreshing(true);
    await loadKpis(rangeDays);
    setRefreshing(false);
  }

  const cards = useMemo(() => {
    if (!kpis) return [];
    return [
      { label: "Signups", value: formatCount(kpis.signups) },
      { label: "Onboarding Completion", value: formatPercent(kpis.onboardingCompletionRate), description: "Completion rate" },
      { label: "Trial Starts", value: formatCount(kpis.trialStarts) },
      { label: "Port Submissions", value: formatCount(kpis.portSubmissions) },
      { label: "D7 Retention", value: formatPercent(kpis.d7Retention) },
      { label: "Calls Handled (72h)", value: formatCount(kpis.callsHandledFirst72h) },
    ];
  }, [kpis]);

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingState message="Loading KPI dashboard..." />
      </ScreenContainer>
    );
  }

  if (!isAdmin) {
    return (
      <ScreenContainer>
        <EmptyState
          title="Restricted"
          message="Funnel KPI dashboard is available to admin accounts only."
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <AppText variant="title" style={styles.title}>Analytics Dashboard</AppText>

        <AppCard style={styles.rangeCard}>
          <AppText variant="section" style={styles.rangeLabel}>Range</AppText>
          <View style={styles.rangeRow}>
            {RANGE_OPTIONS.map((option) => {
              const selected = option === rangeDays;
              return (
                <Pressable
                  key={option}
                  style={[
                    styles.rangeButton,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    selected && [styles.rangeButtonActive, { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary }],
                  ]}
                  onPress={() => setRangeDays(option)}
                >
                  <AppText style={[styles.rangeButtonText, selected && styles.rangeButtonTextActive]}>
                    {option}d
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </AppCard>

        {!!error ? (
          <AppCard style={styles.errorCard}>
            <AppText style={styles.errorText}>{error}</AppText>
          </AppCard>
        ) : null}

        {!error && cards.length === 0 ? (
          <EmptyState
            title="No KPI data"
            message="Metrics will appear when analytics data is available."
          />
        ) : null}

        <View style={styles.grid}>
          {cards.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              description={metric.description}
            />
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
  },
  title: {
    marginBottom: spacing.md,
  },
  rangeCard: {
    marginBottom: spacing.md,
  },
  rangeLabel: {
    marginBottom: spacing.sm,
  },
  rangeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  rangeButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  rangeButtonActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  rangeButtonText: {
    fontWeight: "700",
  },
  rangeButtonTextActive: {
    color: "#fff",
  },
  errorCard: {
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});
