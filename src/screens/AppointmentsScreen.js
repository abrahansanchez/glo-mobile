// src/screens/AppointmentsScreen.js
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { useEffect, useMemo, useState } from "react";
import api from "../config/api";
import LoadingState from "../components/LoadingState";
import ScreenContainer from "../components/layout/ScreenContainer";

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
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [viewMode, setViewMode] = useState("week");
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [isFallbackList, setIsFallbackList] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [focusAppointmentId, setFocusAppointmentId] = useState(null);

  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time", []);
  const selectedRange = useMemo(() => getRangeForMode(anchorDate, viewMode), [anchorDate, viewMode]);

  useEffect(() => {
    loadAppointments();
  }, [selectedRange.start.getTime(), selectedRange.end.getTime()]);

  useEffect(() => {
    const focusDate = route?.params?.focusDate;
    const focusId = route?.params?.focusAppointmentId;
    if (!focusDate) return;
    const parsed = new Date(focusDate);
    if (Number.isNaN(parsed.getTime())) return;
    setAnchorDate(parsed);
    setFocusAppointmentId(focusId || null);
  }, [route?.params?.focusDate, route?.params?.focusAppointmentId]);

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
              style={[styles.modeButton, viewMode === mode && styles.modeButtonActive]}
            >
              <Text style={[styles.modeText, viewMode === mode && styles.modeTextActive]}>
                {mode.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.rangeRowWrap}>
          <View style={styles.rangeRow}>
          <Pressable onPress={() => shiftRange(-1)} style={styles.navButton}>
            <Text style={styles.navButtonText}>Prev</Text>
          </Pressable>
          <Text style={styles.rangeLabel}>{selectedRange.label}</Text>
          <View style={styles.rightNavGroup}>
            <Pressable onPress={jumpToToday} style={styles.todayButton}>
              <Text style={styles.todayButtonText}>Today</Text>
            </Pressable>
            <Pressable onPress={() => shiftRange(1)} style={styles.navButton}>
              <Text style={styles.navButtonText}>Next</Text>
            </Pressable>
          </View>
        </View>
        </View>

        <Text style={styles.tzText}>Times shown in {timezone}</Text>
        {isFallbackList ? (
          <Text style={styles.fallbackText}>Showing upcoming list (range view fallback).</Text>
        ) : null}
      </View>

      {!appointments.length ? (
        <View style={styles.center}>
          <Text style={styles.empty}>
            {isFallbackList ? "No upcoming appointments" : `No appointments in this ${viewMode}.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item._id || `${appointmentStartAt(item) || "unknown"}-${item?.clientName || ""}`}
          contentContainerStyle={{ paddingBottom: 16 }}
          refreshing={refreshing}
          onRefresh={loadAppointments}
          renderItem={({ item }) => (
            <View style={[styles.card, focusAppointmentId === item?._id && styles.focusCard]}>
              <Text style={styles.client}>{item.clientName || item.customerName || "Client"}</Text>
              <Text style={styles.meta}>{formatLocalDateTime(appointmentStartAt(item))}</Text>
              <Text style={styles.badges}>
                {(item?.status || "scheduled").toUpperCase()} · {(item?.source || "manual").toUpperCase()}
              </Text>
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#f7f8fa",
  },
  topControls: {
    marginTop: 6,
    marginBottom: 10,
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
  },
  modeButton: {
    borderWidth: 1,
    borderColor: "#d9dde3",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  modeButtonActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  modeText: {
    fontSize: 12,
    color: "#4b5563",
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
    marginTop: 10,
    marginBottom: 12,
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
    color: "#111827",
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
    fontSize: 12,
    color: "#6b7280",
  },
  fallbackText: {
    marginTop: 6,
    fontSize: 12,
    color: "#92400e",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  empty: {
    fontSize: 16,
    color: "#777",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
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
    color: "#666",
  },
  badges: {
    marginTop: 8,
    fontSize: 12,
    color: "#4b5563",
    fontWeight: "600",
  },
});
