import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Switch,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import AppText from "../../components/ui/AppText";
import AppButton from "../../components/ui/AppButton";
import api from "../../config/api";

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const TIME_OPTIONS = [];
for (let h = 6; h <= 22; h++) {
  for (let m = 0; m < 60; m += 30) {
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const ampm = h >= 12 ? "PM" : "AM";
    TIME_OPTIONS.push({
      value: `${hh}:${mm}`,
      label: `${hour12}:${mm} ${ampm}`,
    });
  }
}

const DEFAULT_HOURS = {
  mon: { open: "09:00", close: "18:00", isClosed: false },
  tue: { open: "09:00", close: "18:00", isClosed: false },
  wed: { open: "09:00", close: "18:00", isClosed: false },
  thu: { open: "09:00", close: "18:00", isClosed: false },
  fri: { open: "09:00", close: "18:00", isClosed: false },
  sat: { open: "10:00", close: "16:00", isClosed: false },
  sun: { open: "09:00", close: "18:00", isClosed: true },
};

export default function BusinessHoursScreen({ navigation }) {
  const { colors } = useTheme();
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPickerFor, setShowPickerFor] = useState(null);

  useEffect(() => {
    loadHours();
  }, []);

  async function loadHours() {
    try {
      const res = await api.get("/hours");
      if (res.data?.businessHours) {
        setHours({ ...DEFAULT_HOURS, ...res.data.businessHours });
      }
    } catch (e) {
      console.log("[HOURS] load failed:", e?.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleDay(dayKey) {
    setHours((prev) => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], isClosed: !prev[dayKey].isClosed },
    }));
  }

  function setTime(dayKey, field, value) {
    setHours((prev) => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], [field]: value },
    }));
    setShowPickerFor(null);
  }

  function formatTime(value) {
    const option = TIME_OPTIONS.find((time) => time.value === value);
    return option ? option.label : value;
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.put("/hours", { businessHours: hours });
      Alert.alert("Saved", "Your business hours have been updated. Your AI now knows when you're open.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", "Failed to save hours. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <AppText style={{ color: colors.textSecondary }}>Loading hours...</AppText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AppText style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your AI uses these hours to answer availability questions and schedule appointments.
        </AppText>

        {DAYS.map((day) => {
          const dayHours = hours[day.key] || DEFAULT_HOURS[day.key];
          const isOpen = !dayHours.isClosed;

          return (
            <View
              key={day.key}
              style={[styles.dayCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.dayHeader}>
                <AppText style={[styles.dayLabel, { color: isOpen ? colors.textPrimary : colors.textMuted }]}>
                  {day.label}
                </AppText>
                <View style={styles.dayRight}>
                  <AppText style={[styles.statusLabel, { color: isOpen ? colors.accent : colors.textMuted }]}>
                    {isOpen ? "Open" : "Closed"}
                  </AppText>
                  <Switch
                    value={isOpen}
                    onValueChange={() => toggleDay(day.key)}
                    trackColor={{ false: colors.border, true: colors.accentBorder }}
                    thumbColor={isOpen ? colors.accent : colors.textSecondary}
                  />
                </View>
              </View>

              {isOpen ? (
                <View style={styles.timesRow}>
                  <TouchableOpacity
                    style={[styles.timeBtn, { borderColor: colors.border, backgroundColor: colors.bg }]}
                    onPress={() => setShowPickerFor(`${day.key}-open`)}
                  >
                    <AppText style={[styles.timeBtnLabel, { color: colors.textMuted }]}>Opens</AppText>
                    <AppText style={[styles.timeBtnValue, { color: colors.textPrimary }]}>
                      {formatTime(dayHours.open)}
                    </AppText>
                  </TouchableOpacity>

                  <AppText style={[styles.timeSep, { color: colors.textMuted }]}>to</AppText>

                  <TouchableOpacity
                    style={[styles.timeBtn, { borderColor: colors.border, backgroundColor: colors.bg }]}
                    onPress={() => setShowPickerFor(`${day.key}-close`)}
                  >
                    <AppText style={[styles.timeBtnLabel, { color: colors.textMuted }]}>Closes</AppText>
                    <AppText style={[styles.timeBtnValue, { color: colors.textPrimary }]}>
                      {formatTime(dayHours.close)}
                    </AppText>
                  </TouchableOpacity>
                </View>
              ) : null}

              {showPickerFor && showPickerFor.startsWith(day.key) ? (
                <ScrollView
                  style={[styles.pickerScroll, { backgroundColor: colors.surface, borderColor: colors.accentBorder }]}
                  nestedScrollEnabled
                >
                  {TIME_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.pickerOption, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        const field = showPickerFor.endsWith("-open") ? "open" : "close";
                        setTime(day.key, field, option.value);
                      }}
                    >
                      <AppText style={[styles.pickerOptionText, { color: colors.textPrimary }]}>
                        {option.label}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : null}
            </View>
          );
        })}

        <AppButton
          variant="primary"
          label={saving ? "Saving..." : "Save hours"}
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={saving}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 20, paddingBottom: 40 },
  subtitle: { fontSize: 13, lineHeight: 20, marginBottom: 20 },
  dayCard: {
    borderWidth: 0.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayLabel: { fontSize: 14, fontWeight: "600" },
  dayRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusLabel: { fontSize: 12, fontWeight: "500" },
  timesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  timeBtn: {
    flex: 1,
    borderWidth: 0.5,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  timeBtnLabel: { fontSize: 10, fontWeight: "500", marginBottom: 3 },
  timeBtnValue: { fontSize: 13, fontWeight: "600" },
  timeSep: { fontSize: 12 },
  pickerScroll: {
    maxHeight: 180,
    borderWidth: 0.5,
    borderRadius: 10,
    marginTop: 8,
  },
  pickerOption: {
    padding: 12,
    borderBottomWidth: 0.5,
  },
  pickerOptionText: { fontSize: 13 },
  saveBtn: { marginTop: 20 },
});
