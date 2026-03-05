import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import OnboardingHeader from "../../onboarding/OnboardingHeader";
import { STEPS } from "../../onboarding/stepKeys";

export default function BusinessSetupScreen({ navigation }) {
  const { updateStep, setLocalStep, updateData, onboardingData } = useContext(OnboardingContext);
  function canNavigateTo(routeName) {
    const routeNames = navigation?.getState?.()?.routeNames || [];
    return routeNames.includes(routeName);
  }

  const [shopName, setShopName] = useState(onboardingData?.shopName || "");
  const [city, setCity] = useState(onboardingData?.city || "");
  const [timezone, setTimezone] = useState(
    onboardingData?.timezone || getDeviceTimezone()
  );
  const [error, setError] = useState("");
  const [openTime, setOpenTime] = useState(onboardingData?.openTime || "09:00");
  const [closeTime, setCloseTime] = useState(onboardingData?.closeTime || "17:00");
  const [businessDays, setBusinessDays] = useState(
    onboardingData?.businessDays || {
      Monday: true,
      Tuesday: true,
      Wednesday: true,
      Thursday: true,
      Friday: true,
      Saturday: true,
      Sunday: false,
    }
  );

  useEffect(() => {
    setLocalStep(STEPS.BUSINESS_SNAPSHOT);
  }, [setLocalStep]);

  function getDeviceTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
    } catch {
      return "America/New_York";
    }
  }

  const timezones = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Anchorage",
    "Pacific/Honolulu",
  ];

  function toggleDay(day) {
    setBusinessDays({ ...businessDays, [day]: !businessDays[day] });
  }

  async function next() {
    setError("");
    if (!shopName.trim()) {
      setError("Enter your shop name");
      return;
    }
    if (!city.trim()) {
      setError("Enter your city");
      return;
    }

    const normalizedOpenTime = normalizeTimeInput(openTime, "09:00");
    const normalizedCloseTime = normalizeTimeInput(closeTime, "17:00");

    await updateData({
      shopName: shopName.trim(),
      city: city.trim(),
      timezone,
      openTime: normalizedOpenTime,
      closeTime: normalizedCloseTime,
      businessDays,
    });

    const result = await updateStep(STEPS.BUSINESS_SNAPSHOT);
    if (result?.complete) return;
    if (canNavigateTo("NumberStrategy")) {
      navigation.navigate("NumberStrategy");
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={24}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.container}
          >
            <OnboardingHeader showLogout={false} showRestart={true} />
            <Text style={styles.title}>Business Snapshot</Text>

        <Text style={styles.label}>Shop Name</Text>
        <TextInput
          value={shopName}
          onChangeText={setShopName}
          placeholder="Your Shop Name"
          style={styles.input}
        />

        <Text style={styles.label}>City</Text>
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="New York"
          style={styles.input}
        />

        <Text style={styles.label}>Timezone</Text>
        <View style={styles.pickerContainer}>
          {timezones.map((tz) => (
            <Pressable
              key={tz}
              onPress={() => setTimezone(tz)}
              style={[
                styles.timezonePill,
                timezone === tz && styles.timezonePillSelected,
              ]}
            >
              <Text
                style={[
                  styles.timezonePillText,
                  timezone === tz && styles.timezonePillTextSelected,
                ]}
              >
                {tz.split("/")[1] || tz}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Business Hours</Text>
        <View style={styles.hoursRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hoursLabel}>Open</Text>
            <TextInput
              value={formatTime12Hour(openTime)}
              onFocus={() => setOpenTime(formatTime12Hour(openTime))}
              onBlur={() => setOpenTime(normalizeTimeInput(openTime, "09:00"))}
              onChangeText={setOpenTime}
              placeholder="9:00 AM"
              style={styles.timeInput}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.hoursLabel}>Close</Text>
            <TextInput
              value={formatTime12Hour(closeTime)}
              onFocus={() => setCloseTime(formatTime12Hour(closeTime))}
              onBlur={() => setCloseTime(normalizeTimeInput(closeTime, "17:00"))}
              onChangeText={setCloseTime}
              placeholder="5:00 PM"
              style={styles.timeInput}
            />
          </View>
        </View>
        <Text style={styles.timeHint}>Use AM/PM format (example: 9:00 AM)</Text>

        <Text style={styles.label}>Open on these days:</Text>
        <View style={styles.daysGrid}>
          {Object.keys(businessDays).map((day) => (
            <Pressable
              key={day}
              onPress={() => toggleDay(day)}
              style={[
                styles.dayPill,
                businessDays[day] && styles.dayPillOn,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  businessDays[day] && styles.dayTextOn,
                ]}
              >
                {day.slice(0, 3)}
              </Text>
            </Pressable>
          ))}
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.button} onPress={next}>
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 140 },
  title: { fontSize: 24, fontWeight: "900", marginBottom: 20 },
  label: { fontWeight: "800", marginBottom: 8, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    fontSize: 16,
  },
  pickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  timezonePill: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timezonePillSelected: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  timezonePillText: { fontWeight: "600", color: "#000", fontSize: 12 },
  timezonePillTextSelected: { color: "#fff" },
  hoursRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  hoursLabel: { fontWeight: "700", fontSize: 12, marginBottom: 4, color: "#666" },
  timeInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  timeHint: { color: "#6b7280", fontSize: 12, marginTop: -6, marginBottom: 10 },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  dayPill: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dayPillOn: { backgroundColor: "#000", borderColor: "#000" },
  dayText: { fontWeight: "600", color: "#000", fontSize: 12 },
  dayTextOn: { color: "#fff" },
  button: {
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: { color: "#fff", fontWeight: "900" },
  error: { color: "red", marginBottom: 10, fontWeight: "700" },
});
  function formatTime12Hour(time24) {
    if (!time24 || typeof time24 !== "string") return "";
    const match = time24.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return time24;
    const hours = Number(match[1]);
    const minutes = match[2];
    if (Number.isNaN(hours) || hours < 0 || hours > 23) return time24;
    const suffix = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes} ${suffix}`;
  }

  function normalizeTimeInput(value, fallback) {
    const raw = String(value || "").trim();
    if (!raw) return fallback;
    const match = raw.match(/^(\d{1,2}):(\d{2})(?:\s*([aApP][mM]))?$/);
    if (!match) return fallback;

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const suffix = match[3] ? match[3].toUpperCase() : null;

    if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes < 0 || minutes > 59) {
      return fallback;
    }

    if (suffix) {
      if (hours < 1 || hours > 12) return fallback;
      if (suffix === "AM") {
        hours = hours === 12 ? 0 : hours;
      } else {
        hours = hours === 12 ? 12 : hours + 12;
      }
    } else if (hours < 0 || hours > 23) {
      return fallback;
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
