import React, { useContext, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import OnboardingHeader from "../../onboarding/OnboardingHeader";

export default function PhoneSignupScreen({ navigation }) {
  const { updateStep } = useContext(OnboardingContext);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState("PHONE"); // PHONE -> OTP
  const [error, setError] = useState("");

  useEffect(() => {
    updateStep("PHONE");
  }, []);

  function handleSendOtp() {
    setError("");
    if (!phone || phone.length < 10) {
      setError("Enter a valid phone number");
      return;
    }
    // Placeholder: backend wiring later
    setStage("OTP");
  }

  function handleVerifyOtp() {
    setError("");
    if (!otp || otp.length < 4) {
      setError("Enter a valid code");
      return;
    }
    // Placeholder: real verify later -> should authenticate user
    // For now, we continue onboarding after login is handled separately
    navigation.navigate("ProfileBasics");
  }

  return (
    <View style={styles.container}>
      <OnboardingHeader />
      <Text style={styles.title}>Set up your account</Text>

      {stage === "PHONE" ? (
        <>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="(555) 555-5555"
            keyboardType="phone-pad"
            style={styles.input}
          />
          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.button} onPress={handleSendOtp}>
            <Text style={styles.buttonText}>Send Code</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.label}>Enter Code</Text>
          <TextInput
            value={otp}
            onChangeText={setOtp}
            placeholder="123456"
            keyboardType="number-pad"
            style={styles.input}
          />
          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.button} onPress={handleVerifyOtp}>
            <Text style={styles.buttonText}>Verify</Text>
          </Pressable>

          <Pressable style={styles.linkBtn} onPress={() => setStage("PHONE")}>
            <Text style={styles.link}>Change phone number</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "900", marginBottom: 20 },
  label: { fontWeight: "700", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 12, padding: 12, marginBottom: 12 },
  button: { backgroundColor: "#000", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#fff", fontWeight: "900" },
  error: { color: "red", marginBottom: 10 },
  linkBtn: { marginTop: 14, alignItems: "center" },
  link: { color: "#111", textDecorationLine: "underline", fontWeight: "700" },
});
