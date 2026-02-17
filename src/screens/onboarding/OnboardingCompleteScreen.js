import React, { useContext, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OnboardingContext } from "../../onboarding/OnboardingContext";

export default function OnboardingCompleteScreen({ navigation }) {
  const { updateStep, markComplete } = useContext(OnboardingContext);

  useEffect(() => {
    updateStep("ONBOARDING_COMPLETE");
  }, [updateStep]);

  async function goToDashboard() {
    await markComplete();
    // AppNavigator will automatically re-render and show Dashboard
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🎉</Text>
        </View>

        <Text style={styles.title}>You're All Set!</Text>
        <Text style={styles.subtitle}>
          Your business profile is ready. Start receiving calls with Glō.
        </Text>

        <View style={styles.featuresList}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureText}>AI-powered call handling</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureText}>Automatic booking</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureText}>24/7 availability</Text>
          </View>
        </View>

        <Pressable style={styles.button} onPress={goToDashboard}>
          <Text style={styles.buttonText}>Go to Dashboard</Text>
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
    paddingTop: 32,
    paddingBottom: 24,
    justifyContent: "center",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  icon: { fontSize: 80 },
  title: {
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
    fontWeight: "500",
    lineHeight: 24,
  },
  featuresList: {
    marginBottom: 32,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
    fontWeight: "900",
    color: "#000",
  },
  featureText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    flex: 1,
  },
  button: {
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "900", fontSize: 16 },
});
