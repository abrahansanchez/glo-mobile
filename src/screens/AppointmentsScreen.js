// src/screens/AppointmentsScreen.js
import { View, FlatList, StyleSheet, Pressable } from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../config/api";
import LoadingState from "../components/LoadingState";
import ScreenContainer from "../components/layout/ScreenContainer";
import AppCard from "../components/ui/AppCard";
import AppBadge from "../components/ui/AppBadge";
import AppText from "../components/ui/AppText";
import EmptyState from "../components/ui/EmptyState";
import { spacing, radii } from "../ui/tokens";
import { useTheme } from "../theme/ThemeContext";

function startOfDayLocal(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(value, days) {
  const d = new Date(value);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(value, months) {
  const d = new Date(value);
  d.setMonth(d.getMonth() + months);
  return d;
}

function getRangeForMode(anchorDate, viewMode) {
  const localDayStart = startOfDayLocal(anchorDate);

  if (viewMode === "day") {
    return {
      start: localDayStart,
      end: addDays(localDayStart, 1),
      label: localDayStart.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
    };
  }

  if (viewMode === "week") {
    const weekStart = addDays(localDayStart, -localDayStart.getDay());
    const weekEnd = addDays(weekStart, 7);
    return {
      start: weekStart,
      end: weekEnd,
      label: `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${addDays(
        weekEnd,
        -1
      ).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
    };
  }

  const monthStart = new Date(localDayStart.getFullYear(), localDayStart.getMonth(), 1);
  const monthEnd = new Date(localDayStart.getFullYear(), localDayStart.getMonth() + 1, 1);
  return {
    start: monthStart,
    end: monthEnd,
    label: monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
  };
}

function appointmentStartAt(item) {
  return item?.startAt || item?.date || item?.scheduledAt || item?.createdAt || null;
}

function formatLocalDateTime(value) {
  if (!value) return "Time unavailable";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Time unavailable";
  return d.toLocaleString();
}

export default function AppointmentsScreen({ route }) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [viewMode, setViewMode] = useState("week");
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [isFallbackList, setIsFallbackList] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [focusAppointmentId, setFocusAppointmentId] = useState(null);
  const [focusDateLabel, setFocusDateLabel] = useState("");
  const listRef = useRef(null);

  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time", []);
  const selectedRange = useMemo(() => getRangeForMode(anchorDate, viewMode), [anchorDate, viewMode]);

  useEffect(() => {
    loadAppointments();
  }, [selectedRange.start.getTime(), selectedRange.end.getTime()]);

  useEffect(() => {
    const focusDate = route?.params?.focusDate || route?.params?.date;
    const focusId = route?.params?.focusAppointmentId;
    if (!focusDate) return;
    const parsed = new Date(focusDate);
    if (Number.isNaN(parsed.getTime())) return;
    setViewMode(route?.params?.initialView || "day");
    setAnchorDate(parsed);
    setFocusAppointmentId(focusId || null);
    setFocusDateLabel(parsed.toLocaleDateString());
  }, [route?.params?.focusDate, route?.params?.date, route?.params?.initialView, route?.params?.focusAppointmentId, route?.params?.focusRequestAt]);

  useEffect(() => {
    if (!focusAppointmentId || appointments.length === 0) return;
    const index = appointments.findIndex((item) => item?._id === focusAppointmentId);
    if (index < 0) return;

    const scroll = () =>
      listRef.current?.scrollToIndex?.({
        index,
        animated: true,
        viewPosition: 0.2,
      });

    const timeoutId = setTimeout(scroll, 120);
    return () => clearTimeout(timeoutId);
  }, [appointments, focusAppointmentId]);

  async function loadAppointments() {
    setLoading(true);
    setRefreshing(true);
    try {
      const res = await api.get("/appointments/range", {
        params: {
          start: selectedRange.start.toISOString(),
          end: selectedRange.end.toISOString(),
        },
      });

      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.appointments || [];

      setAppointments(list);
      setIsFallbackList(false);
    } catch (err) {
      console.log("Appointments range error, falling back to upcoming:", err?.message || err);
      try {
        const res = await api.get("/appointments/upcoming");
        const list = Array.isArray(res.data)
          ? res.data
          : res.data?.appointments || [];
        setAppointments(list);
        setIsFallbackList(true);
      } catch (fallbackErr) {
        console.log("Appointments fallback error:", fallbackErr?.message || fallbackErr);
        setAppointments([]);
        setIsFallbackList(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function shiftRange(direction) {
    if (viewMode === "day") {
      setAnchorDate((prev) => addDays(prev, direction));
      return;
    }
    if (viewMode === "week") {
      setAnchorDate((prev) => addDays(prev, 7 * direction));
      return;
    }
    setAnchorDate((prev) => addMonths(prev, direction));
  }

  function jumpToToday() {
    setAnchorDate(new Date());
  }

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingState label="Loading appointments..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.screen}>
      <View style={styles.topControls}>
        <View style={styles.modeRow}>
          {["day", "week", "month"].map((mode) => (
            <Pressable
              key={mode}
              onPress={() => setViewMode(mode)}
              style={[
                styles.modeButton,
                { borderColor: colors.border, backgroundColor: colors.card },
                viewMode === mode && [styles.modeButtonActive, { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary }],
              ]}
            >
              <AppText style={[styles.modeText, viewMode === mode && styles.modeTextActive]}>
                {mode.toUpperCase()}
              </AppText>
            </Pressable>
          ))}
        </View>

        <View style={styles.rangeRowWrap}>
          <View style={styles.rangeRow}>
          <Pressable onPress={() => shiftRange(-1)} style={styles.navButton}>
            <AppText style={styles.navButtonText}>Prev</AppText>
          </Pressable>
          <AppText style={styles.rangeLabel}>{selectedRange.label}</AppText>
          <View style={styles.rightNavGroup}>
            <Pressable onPress={jumpToToday} style={styles.todayButton}>
              <AppText style={styles.todayButtonText}>Today</AppText>
            </Pressable>
            <Pressable onPress={() => shiftRange(1)} style={styles.navButton}>
              <AppText style={styles.navButtonText}>Next</AppText>
            </Pressable>
          </View>
        </View>
        </View>

        <AppText variant="caption" style={styles.tzText}>Times shown in {timezone}</AppText>
        {isFallbackList ? (
          <AppText variant="caption" style={styles.fallbackText}>Showing upcoming appointments while date-range view updates.</AppText>
        ) : null}
        {!!focusDateLabel ? (
          <AppText variant="caption" style={styles.focusInfo}>Focused date: {focusDateLabel}</AppText>
        ) : null}
      </View>

      {!appointments.length ? (
        <EmptyState
          title={isFallbackList ? "No upcoming appointments" : "No appointments"}
          message={isFallbackList ? "No upcoming appointments found right now." : `No appointments in this ${viewMode}.`}
        />
      ) : (
        <FlatList
          ref={listRef}
          data={appointments}
          keyExtractor={(item) => item._id || `${appointmentStartAt(item) || "unknown"}-${item?.clientName || ""}`}
          contentContainerStyle={{ paddingBottom: 16 }}
          refreshing={refreshing}
          onRefresh={loadAppointments}
          onScrollToIndexFailed={({ index }) => {
            setTimeout(() => {
              listRef.current?.scrollToOffset?.({
                offset: Math.max(0, index * 110),
                animated: true,
              });
            }, 200);
          }}
          renderItem={({ item }) => (
            <AppCard style={[styles.card, focusAppointmentId === item?._id && styles.focusCard]}>
              <AppText style={styles.client}>{item.clientName || item.customerName || "Client"}</AppText>
              <AppText variant="body" style={styles.meta}>{formatLocalDateTime(appointmentStartAt(item))}</AppText>
              <View style={styles.badgeRow}>
                <AppBadge
                  label={(item?.status || "scheduled").toUpperCase()}
                  tone={item?.status === "confirmed" || item?.status === "completed" ? "success" : "neutral"}
                />
                <AppBadge label={(item?.source || "manual").toUpperCase()} tone="neutral" />
              </View>
            </AppCard>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {},
  topControls: {
    marginTop: 6,
    marginBottom: spacing.md,
  },
  modeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modeButton: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modeButtonActive: {
    backgroundColor: "#111827",
  },
  modeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modeTextActive: {
    color: "#fff",
  },
  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rangeRowWrap: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  rightNavGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  navButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navButtonText: {
    color: "#2563eb",
    fontWeight: "600",
  },
  rangeLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  todayButton: {
    borderWidth: 1,
    borderColor: "#2563eb",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  todayButtonText: {
    color: "#2563eb",
    fontWeight: "700",
    fontSize: 12,
  },
  tzText: {
    marginTop: 4,
  },
  fallbackText: {
    marginTop: 6,
    color: colors.warning,
  },
  focusInfo: {
    marginTop: 6,
    color: "#2563eb",
    fontWeight: "600",
  },
  card: {
    marginBottom: spacing.sm,
  },
  focusCard: {
    borderWidth: 2,
    borderColor: "#2563eb",
  },
  client: {
    fontSize: 16,
    fontWeight: "600",
  },
  meta: {
    marginTop: 4,
    color: colors.textSecondary,
  },
  badgeRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: spacing.xs,
  },
});
