import React, { useContext, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import api from "../../config/api";
import OnboardingHeader from "../../onboarding/OnboardingHeader";
import { STEPS } from "../../onboarding/stepKeys";

export default function NumberStrategyScreen({ navigation }) {
  const { updateStep, updateData, onboardingData } = useContext(OnboardingContext);
  const [choice, setChoice] = useState(onboardingData?.numberStrategy || "new_number");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      await api.post("/phone/number-strategy", { strategy: choice });
      await updateData({ numberStrategy: choice });
      await updateStep(STEPS.NUMBER_STRATEGY);
      if (choice === "port_existing") {
        navigation.navigate("PortingForm");
      } else {
        navigation.navigate("TrialStart");
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save number strategy");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <OnboardingHeader />
      <Text style={styles.title}>Keep Your Current Number?</Text>
      <Text style={styles.subtitle}>Most businesses keep their number so clients don’t update contacts.</Text>

      <Pressable
        onPress={() => setChoice("port_existing")}
        style={[styles.card, choice === "port_existing" && styles.cardSelected]}
      >
        <Text style={styles.cardTitle}>Port my existing number</Text>
        <Text style={styles.cardDesc}>Transfer your current business line into Glō.</Text>
      </Pressable>

      <Pressable
        onPress={() => setChoice("new_number")}
        style={[styles.card, choice === "new_number" && styles.cardSelected]}
      >
        <Text style={styles.cardTitle}>Get a new Glō number</Text>
        <Text style={styles.cardDesc}>Start faster with a new number now.</Text>
      </Pressable>

      {!!error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={[styles.button, submitting && styles.buttonDisabled]} onPress={submit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? "Saving..." : "Continue"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "900", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#555", marginBottom: 20 },
  card: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  cardSelected: { borderColor: "#111827", borderWidth: 2 },
  cardTitle: { fontWeight: "800", fontSize: 16, marginBottom: 6 },
  cardDesc: { color: "#4b5563", fontSize: 13 },
  button: {
    marginTop: 10,
    backgroundColor: "#000",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontWeight: "900" },
  error: { color: "#b00020", fontWeight: "700", marginBottom: 8 },
});
