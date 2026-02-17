import React, { useContext, useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import OnboardingHeader from "../../onboarding/OnboardingHeader";

export default function BusinessSetupScreen({ navigation }) {
  const { updateStep, updateData, onboardingData } = useContext(OnboardingContext);

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
    updateStep("BUSINESS_SETUP");
  }, [updateStep]);

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

    await updateData({
      shopName: shopName.trim(),
      city: city.trim(),
      timezone,
      openTime,
      closeTime,
      businessDays,
    });

    navigation.navigate("Services");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <OnboardingHeader showLogout={false} showRestart={true} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Business Setup</Text>

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
              value={openTime}
              onChangeText={setOpenTime}
              placeholder="09:00"
              style={styles.timeInput}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.hoursLabel}>Close</Text>
            <TextInput
              value={closeTime}
              onChangeText={setCloseTime}
              placeholder="17:00"
              style={styles.timeInput}
            />
          </View>
        </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
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
