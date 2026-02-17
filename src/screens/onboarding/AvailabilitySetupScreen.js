import React, { useContext, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import OnboardingHeader from "../../onboarding/OnboardingHeader";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AvailabilitySetupScreen({ navigation }) {
  const { updateStep } = useContext(OnboardingContext);

  const [selectedDays, setSelectedDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");

  useEffect(() => {
    updateStep("AVAILABILITY");
  }, []);

  function toggleDay(day) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function next() {
    // TODO: POST to backend (availability)
    navigation.navigate("NumberChoice");
  }

  function adjustTime(timeStr, deltaHours) {
    const [hh, mm] = timeStr.split(":").map((s) => parseInt(s, 10));
    let h = hh + deltaHours;
    if (h < 0) h = 0;
    if (h > 23) h = 23;
    return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set Your Availability</Text>

      <Text style={styles.label}>Working Days</Text>
      <View style={styles.daysRow}>
        {DAYS.map((d) => (
          <Pressable
            key={d}
            onPress={() => toggleDay(d)}
            style={[styles.dayPill, selectedDays.includes(d) && styles.dayPillOn]}
          >
            <Text style={[styles.dayText, selectedDays.includes(d) && styles.dayTextOn]}>{d}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Hours</Text>
      <View style={styles.hoursRow}>
        <View style={styles.hourBox}>
          <Text style={styles.hourLabel}>Start</Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable onPress={() => setStart(adjustTime(start, -1))} style={styles.timeBtn}>
              <Text style={styles.timeBtnText}>-</Text>
            </Pressable>
            <Text style={styles.hourValue}>{start}</Text>
            <Pressable onPress={() => setStart(adjustTime(start, 1))} style={styles.timeBtn}>
              <Text style={styles.timeBtnText}>+</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.hourBox}>
          <Text style={styles.hourLabel}>End</Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable onPress={() => setEnd(adjustTime(end, -1))} style={styles.timeBtn}>
              <Text style={styles.timeBtnText}>-</Text>
            </Pressable>
            <Text style={styles.hourValue}>{end}</Text>
            <Pressable onPress={() => setEnd(adjustTime(end, 1))} style={styles.timeBtn}>
              <Text style={styles.timeBtnText}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Pressable style={styles.button} onPress={next}>
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "900", marginBottom: 20 },
  label: { fontWeight: "800", marginBottom: 10 },
  daysRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 },
  dayPill: { borderWidth: 1, borderColor: "#ccc", borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  dayPillOn: { backgroundColor: "#000", borderColor: "#000" },
  dayText: { fontWeight: "800", color: "#000" },
  dayTextOn: { color: "#fff" },
  hoursRow: { flexDirection: "row", gap: 12, marginBottom: 18 },
  hourBox: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 12, padding: 12 },
  hourLabel: { fontWeight: "800", marginBottom: 6 },
  hourValue: { fontWeight: "800", fontSize: 16 },
  button: { backgroundColor: "#000", padding: 14, borderRadius: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "900" },
  timeBtn: { padding: 8, borderRadius: 8, backgroundColor: "#eee" },
  timeBtnText: { fontWeight: "900", fontSize: 16 },
});
