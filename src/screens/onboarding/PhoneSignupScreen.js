import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import OnboardingHeader from "../../onboarding/OnboardingHeader";
import { STEPS } from "../../onboarding/stepKeys";

export default function PhoneSignupScreen({ navigation }) {
  const { updateStep, setLocalStep } = useContext(OnboardingContext);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState("PHONE"); // PHONE -> OTP
  const [error, setError] = useState("");

  useEffect(() => {
    setLocalStep(STEPS.ACCOUNT);
  }, [setLocalStep]);

  function handleSendOtp() {
    setError("");
    if (!phone || phone.length < 10) {
      setError("Enter a valid phone number");
      return;
    }
    // Placeholder: backend wiring later
    setStage("OTP");
  }

  async function handleVerifyOtp() {
    setError("");
    if (!otp || otp.length < 4) {
      setError("Enter a valid code");
      return;
    }
    // Placeholder: real verify later -> should authenticate user
    // For now, we continue onboarding after login is handled separately
    const result = await updateStep(STEPS.ACCOUNT);
    if (result?.complete) return;
    if (canNavigateTo("BusinessSnapshot")) {
      navigation.navigate("BusinessSnapshot");
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
          <Text style={styles.title}>Create Your Glō Workspace</Text>

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
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flexGrow: 1, padding: 24, justifyContent: "center", paddingBottom: 140 },
  title: { fontSize: 24, fontWeight: "900", marginBottom: 20 },
  label: { fontWeight: "700", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 12, padding: 12, marginBottom: 12 },
  button: { backgroundColor: "#000", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#fff", fontWeight: "900" },
  error: { color: "red", marginBottom: 10 },
  linkBtn: { marginTop: 14, alignItems: "center" },
  link: { color: "#111", textDecorationLine: "underline", fontWeight: "700" },
});
  function canNavigateTo(routeName) {
    const routeNames = navigation?.getState?.()?.routeNames || [];
    return routeNames.includes(routeName);
  }
