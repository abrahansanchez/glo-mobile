import React, { useContext, useState } from "react";
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
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import api from "../../config/api";
import OnboardingHeader from "../../onboarding/OnboardingHeader";

export default function PortingFormScreen({ navigation }) {
  const { setLocalStep } = useContext(OnboardingContext);
  const [form, setForm] = useState({
    phoneNumber: "",
    carrier: "",
    accountNumber: "",
    pin: "",
    billingZip: "",
    contactName: "",
    contactEmail: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submitPorting() {
    setLoading(true);
    setError("");
    try {
      await setLocalStep("porting_form");
      await api.post("/phone/porting/start", {
        ...form,
        idempotencyKey: `porting-${Date.now()}`,
      });
      navigation.navigate("PortingTracker");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to submit port request");
    } finally {
      setLoading(false);
    }
  }

  return (
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
          <OnboardingHeader />
          <Text style={styles.title}>Port Your Number</Text>
          <Text style={styles.subtitle}>Usually 3-10 business days depending on your carrier.</Text>

        {[
          ["phoneNumber", "Phone Number"],
          ["carrier", "Carrier"],
          ["accountNumber", "Account Number"],
          ["pin", "PIN / Passcode"],
          ["billingZip", "Billing ZIP"],
          ["contactName", "Authorized Contact Name"],
          ["contactEmail", "Authorized Contact Email"],
        ].map(([key, label]) => (
          <View key={key}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              value={form[key]}
              onChangeText={(value) => setField(key, value)}
              autoCapitalize="none"
              keyboardType={key === "contactEmail" ? "email-address" : "default"}
              style={styles.input}
            />
          </View>
        ))}

          {!!error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={[styles.primaryBtn, loading && styles.disabled]} disabled={loading} onPress={submitPorting}>
            <Text style={styles.primaryText}>{loading ? "Submitting..." : "Submit Port Request"}</Text>
          </Pressable>

          <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("TrialStart")}>
            <Text style={styles.secondaryText}>I'll do this later</Text>
          </Pressable>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { paddingHorizontal: 20, paddingBottom: 140, paddingTop: 8 },
  title: { fontSize: 26, fontWeight: "900", marginBottom: 6 },
  subtitle: { color: "#4b5563", marginBottom: 14 },
  label: { fontWeight: "700", marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, padding: 12 },
  primaryBtn: {
    backgroundColor: "#000",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  disabled: { opacity: 0.7 },
  primaryText: { color: "#fff", fontWeight: "900" },
  secondaryBtn: { marginTop: 10, alignItems: "center", paddingVertical: 10 },
  secondaryText: { color: "#111827", textDecorationLine: "underline", fontWeight: "700" },
  error: { color: "#b00020", fontWeight: "700", marginTop: 8 },
});
