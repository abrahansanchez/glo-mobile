import React, { useContext, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import OnboardingHeader from "../../onboarding/OnboardingHeader";

export default function PhoneNumberChoiceScreen({ navigation }) {
  const { updateStep, updateData, onboardingData } = useContext(OnboardingContext);

  const [choice, setChoice] = useState(onboardingData?.phoneChoice || "new");

  useEffect(() => {
    updateStep("PHONE_CHOICE");
  }, [updateStep]);

  async function next() {
    await updateData({ phoneChoice: choice });
    navigation.navigate("CalendarConnect");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <OnboardingHeader showLogout={false} showRestart={true} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Your Phone Number</Text>
        <Text style={styles.subtitle}>
          Which would you prefer?
        </Text>

        {/* Get a new Glō number */}
        <Pressable
          onPress={() => setChoice("new")}
          style={[
            styles.card,
            choice === "new" && styles.cardSelected,
          ]}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.radio,
                choice === "new" && styles.radioSelected,
              ]}
            >
              {choice === "new" && <View style={styles.radioDot} />}
            </View>
            <Text style={styles.cardTitle}>Get a New Glō Number</Text>
          </View>
          <Text style={styles.cardDesc}>
            We'll assign you a dedicated Glō phone number for your business.
          </Text>
        </Pressable>

        {/* Use existing number */}
        <Pressable
          onPress={() => setChoice("existing")}
          style={[
            styles.card,
            choice === "existing" && styles.cardSelected,
            styles.cardDisabled,
          ]}
          disabled={true}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.radio,
                choice === "existing" && styles.radioSelected,
              ]}
            >
              {choice === "existing" && <View style={styles.radioDot} />}
            </View>
            <Text style={styles.cardTitle}>Port My Existing Number</Text>
          </View>
          <Text style={styles.cardDesc}>
            Coming soon. You'll be able to forward your existing number to Glō.
          </Text>
          <Text style={styles.badge}>Coming Soon</Text>
        </Pressable>

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
  title: { fontSize: 24, fontWeight: "900", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 20, fontWeight: "500" },
  card: {
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  cardSelected: {
    borderColor: "#000",
    backgroundColor: "#fff",
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  radioSelected: {
    borderColor: "#000",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#000",
  },
  cardTitle: { fontWeight: "900", fontSize: 16, flex: 1 },
  cardDesc: {
    fontSize: 13,
    color: "#666",
    marginLeft: 36,
    marginBottom: 8,
    fontWeight: "500",
  },
  badge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#999",
    marginLeft: 36,
  },
  button: {
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: { color: "#fff", fontWeight: "900" },
});
