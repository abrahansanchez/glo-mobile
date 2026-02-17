import React, { useContext, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import OnboardingHeader from "../../onboarding/OnboardingHeader";

export default function GoLiveScreen() {
  const { updateStep, markComplete } = useContext(OnboardingContext);

  useEffect(() => {
    updateStep("GO_LIVE");
  }, []);

  async function enterDashboard() {
    // ✅ M0.5.10 Trial Activation (Smart Placement)
    // Backend will set TRIAL automatically after onboarding completion in future.
    // For now, we complete onboarding locally so routing works.
    await markComplete();
  }

  return (
    <View style={styles.container}>
      <OnboardingHeader />
      <Text style={styles.title}>You’re Live</Text>
      <Text style={styles.sub}>
        Glō is now ready to answer your calls.
      </Text>

      <Pressable
        style={[styles.button, styles.secondary]}
        onPress={() => {
          // Optional: place a placeholder action
          // Real version: show assigned number / instructions
        }}
      >
        <Text style={styles.secondaryText}>Call your number to test</Text>
      </Pressable>

      <Pressable style={[styles.button, styles.primary]} onPress={enterDashboard}>
        <Text style={styles.primaryText}>Enter Dashboard</Text>
      </Pressable>

      <Text style={styles.note}>
        Trial begins automatically after setup (backend-controlled).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "900", marginBottom: 10 },
  sub: { fontSize: 15, fontWeight: "700", color: "#333", marginBottom: 18 },
  button: { paddingVertical: 14, borderRadius: 12, alignItems: "center", marginBottom: 12 },
  primary: { backgroundColor: "#000" },
  primaryText: { color: "#fff", fontWeight: "900" },
  secondary: { backgroundColor: "#eee" },
  secondaryText: { color: "#000", fontWeight: "900" },
  note: { marginTop: 10, color: "#666", fontWeight: "700" },
});
