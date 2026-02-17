import React, { useContext, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import OnboardingHeader from "../../onboarding/OnboardingHeader";

export default function PermissionsScreen({ navigation }) {
  const { updateStep, updateData } = useContext(OnboardingContext);
  const [granted, setGranted] = useState({
    notifications: false,
    microphone: false,
    contacts: false,
  });

  useEffect(() => {
    updateStep("PERMISSIONS");
  }, [updateStep]);

  // Placeholder toggles (real permission prompts later)
  function toggle(key) {
    setGranted((p) => ({ ...p, [key]: !p[key] }));
  }

  async function next() {
    await updateData({ permissions: granted });
    navigation.navigate("OnboardingComplete");
  }

  async function skip() {
    navigation.navigate("OnboardingComplete");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <OnboardingHeader showLogout={false} showRestart={true} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Permissions</Text>
        <Text style={styles.sub}>Glō needs a few permissions to work properly.</Text>

        <Pressable style={styles.row} onPress={() => toggle("notifications")}>
          <Text style={styles.label}>Notifications (required)</Text>
          <Text style={styles.value}>{granted.notifications ? "ON" : "OFF"}</Text>
        </Pressable>

        <Pressable style={styles.row} onPress={() => toggle("microphone")}>
          <Text style={styles.label}>Microphone (required)</Text>
          <Text style={styles.value}>{granted.microphone ? "ON" : "OFF"}</Text>
        </Pressable>

        <Pressable style={styles.row} onPress={() => toggle("contacts")}>
          <Text style={styles.label}>Contacts (optional)</Text>
          <Text style={styles.value}>{granted.contacts ? "ON" : "OFF"}</Text>
        </Pressable>

        <Pressable style={styles.button} onPress={next}>
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>

        <Pressable style={styles.skipButton} onPress={skip}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  title: { fontSize: 24, fontWeight: "900", marginBottom: 10 },
  sub: { fontWeight: "700", color: "#333", marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#eee" },
  label: { fontWeight: "900" },
  value: { fontWeight: "900", color: "#000" },
  button: { backgroundColor: "#000", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 18 },
  buttonText: { color: "#fff", fontWeight: "900" },
  skipButton: { padding: 12, borderRadius: 12, alignItems: "center", marginTop: 10 },
  skipButtonText: { color: "#666", fontWeight: "700" },
});
