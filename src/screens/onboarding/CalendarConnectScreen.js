import React, { useContext, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import OnboardingHeader from "../../onboarding/OnboardingHeader";

export default function CalendarConnectScreen({ navigation }) {
  const { updateStep, updateData } = useContext(OnboardingContext);

  useEffect(() => {
    updateStep("CALENDAR_CONNECT");
  }, [updateStep]);

  async function handleConnect() {
    // TODO: Implement Google Calendar OAuth
    await updateData({ calendarConnected: true });
    next();
  }

  async function next() {
    navigation.navigate("Permissions");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <OnboardingHeader showLogout={false} showRestart={true} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Connect Calendar</Text>
        <Text style={styles.subtitle}>
          Glō can check your availability before booking calls.
        </Text>

        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📅</Text>
        </View>

        <Pressable
          style={styles.buttonPrimary}
          onPress={handleConnect}
        >
          <Text style={styles.buttonText}>Connect Google Calendar</Text>
        </Pressable>

        <Text style={styles.comingSoon}>
          (Coming soon — for now, you can skip this step)
        </Text>

        <Pressable style={styles.buttonSecondary} onPress={next}>
          <Text style={styles.buttonSecondaryText}>Skip for Now</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    justifyContent: "center",
  },
  title: { fontSize: 24, fontWeight: "900", marginBottom: 8, textAlign: "center" },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 32,
    fontWeight: "500",
    textAlign: "center",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  icon: { fontSize: 64 },
  buttonPrimary: {
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  comingSoon: {
    textAlign: "center",
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
    marginBottom: 16,
  },
  buttonSecondary: {
    borderWidth: 2,
    borderColor: "#000",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonSecondaryText: { color: "#000", fontWeight: "900", fontSize: 16 },
});
