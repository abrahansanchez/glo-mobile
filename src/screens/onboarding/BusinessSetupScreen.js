import React, { useContext, useEffect, useState } from "react";
import {
  View,
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
import AppButton from "../../components/ui/AppButton";
import OnboardingHero from "../../components/onboarding/OnboardingHero";
import AppText from "../../components/ui/AppText";
import AppCard from "../../components/ui/AppCard";
import { spacing } from "../../ui/tokens";
import { useTheme } from "../../theme/ThemeContext";

export default function BusinessSetupScreen({ navigation }) {
  const { updateStep, setLocalStep, updateData, onboardingData } = useContext(OnboardingContext);
  const { colors } = useTheme();
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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
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
            <OnboardingHero
              stepLabel="Step 3 of 9"
              title="Business Snapshot"
              subtitle="Set your business profile and hours to personalize call handling."
            />

        <AppCard style={styles.sectionCard}>
          <AppText style={styles.label}>Shop Name</AppText>
          <TextInput
            value={shopName}
            onChangeText={setShopName}
            placeholder="Your Shop Name"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
          />

          <AppText style={styles.label}>City</AppText>
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="New York"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
          />
        </AppCard>

        <AppCard style={styles.sectionCard}>
        <AppText style={styles.label}>Timezone</AppText>
        <View style={styles.pickerContainer}>
          {timezones.map((tz) => (
            <Pressable
              key={tz}
              onPress={() => setTimezone(tz)}
              style={[
                styles.timezonePill,
                { borderColor: colors.border, backgroundColor: colors.card },
                timezone === tz && styles.timezonePillSelected,
                timezone === tz && { borderColor: colors.textPrimary, backgroundColor: colors.textPrimary },
              ]}
            >
              <AppText
                style={[
                  styles.timezonePillText,
                  { color: colors.textPrimary },
                  timezone === tz && { color: colors.bg },
                ]}
              >
                {tz.split("/")[1] || tz}
              </AppText>
            </Pressable>
          ))}
        </View>

        <AppText style={styles.label}>Business Hours</AppText>
        <View style={styles.hoursRow}>
          <View style={{ flex: 1 }}>
            <AppText style={styles.hoursLabel}>Open</AppText>
            <TextInput
              value={formatTime12Hour(openTime)}
              onFocus={() => setOpenTime(formatTime12Hour(openTime))}
              onBlur={() => setOpenTime(normalizeTimeInput(openTime, "09:00"))}
              onChangeText={setOpenTime}
              placeholder="9:00 AM"
              placeholderTextColor={colors.textMuted}
              style={[styles.timeInput, { borderColor: colors.border, color: colors.textPrimary }]}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <AppText style={styles.hoursLabel}>Close</AppText>
            <TextInput
              value={formatTime12Hour(closeTime)}
              onFocus={() => setCloseTime(formatTime12Hour(closeTime))}
              onBlur={() => setCloseTime(normalizeTimeInput(closeTime, "17:00"))}
              onChangeText={setCloseTime}
              placeholder="5:00 PM"
              placeholderTextColor={colors.textMuted}
              style={[styles.timeInput, { borderColor: colors.border, color: colors.textPrimary }]}
            />
          </View>
        </View>
        <AppText style={[styles.timeHint, { color: colors.textMuted }]}>Use AM/PM format (example: 9:00 AM)</AppText>

        <AppText style={styles.label}>Open on these days:</AppText>
        <View style={styles.daysGrid}>
          {Object.keys(businessDays).map((day) => (
            <Pressable
              key={day}
              onPress={() => toggleDay(day)}
              style={[
                styles.dayPill,
                { borderColor: colors.border, backgroundColor: colors.card },
                businessDays[day] && styles.dayPillOn,
                businessDays[day] && { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
              ]}
            >
              <AppText
                style={[
                  styles.dayText,
                  { color: colors.textPrimary },
                  businessDays[day] && { color: colors.bg },
                ]}
              >
                {day.slice(0, 3)}
              </AppText>
            </Pressable>
          ))}
        </View>
        </AppCard>

        {!!error && <AppText style={[styles.error, { color: colors.danger }]}>{error}</AppText>}

        <AppButton style={styles.button} onPress={next} label="Continue" />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 140 },
  sectionCard: { marginBottom: spacing.md },
  label: { fontWeight: "800", marginBottom: 8, marginTop: 12 },
  input: {
    borderWidth: 1,
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
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timezonePillSelected: {},
  timezonePillText: { fontWeight: "600", fontSize: 12 },
  hoursRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  hoursLabel: { fontWeight: "700", fontSize: 12, marginBottom: 4 },
  timeInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  timeHint: { fontSize: 12, marginTop: -6, marginBottom: 10 },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  dayPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dayPillOn: {},
  dayText: { fontWeight: "600", fontSize: 12 },
  dayTextOn: {},
  button: { marginTop: 20 },
  error: { marginBottom: 10, fontWeight: "700" },
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
