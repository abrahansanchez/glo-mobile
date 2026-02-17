import React, { useContext, useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import OnboardingHeader from "../../onboarding/OnboardingHeader";

export default function ProfileBasicsScreen({ navigation }) {
  const { updateStep } = useContext(OnboardingContext);

  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en");
  const [error, setError] = useState("");

  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
    } catch {
      return "America/New_York";
    }
  }, []);

  useEffect(() => {
    updateStep("PROFILE");
  }, [updateStep]);

  function next() {
    setError("");
    if (!name.trim()) {
      setError("Enter your display name");
      return;
    }

    // TODO: POST to backend later:
    // { displayName: name, timezone, language }

    navigation.navigate("Availability");
  }

  return (
    <View style={styles.container}>
      {/* Back + Restart is OK here. Logout stays hidden during onboarding. */}
      <OnboardingHeader showLogout={false} showRestart={true} />

      <Text style={styles.title}>Profile Basics</Text>

      <Text style={styles.label}>Display Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Abe the Barber"
        style={styles.input}
      />

      <Text style={styles.label}>Timezone</Text>
      <View style={styles.readOnlyBox}>
        <Text style={styles.readOnlyText}>{timezone}</Text>
        <Text style={styles.readOnlyHint}>Auto-detected from your phone</Text>
      </View>

      <Text style={styles.label}>Preferred Language</Text>
      <View style={styles.langRow}>
        <Pressable
          onPress={() => setLanguage("en")}
          style={[styles.langPill, language === "en" && styles.langPillOn]}
        >
          <Text style={[styles.langText, language === "en" && styles.langTextOn]}>
            English
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setLanguage("es")}
          style={[styles.langPill, language === "es" && styles.langPillOn]}
        >
          <Text style={[styles.langText, language === "es" && styles.langTextOn]}>
            Español
          </Text>
        </Pressable>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={next}>
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "900", marginBottom: 20 },
  label: { fontWeight: "800", marginBottom: 8 },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },

  readOnlyBox: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    backgroundColor: "#f7f7f7",
  },
  readOnlyText: { fontWeight: "900", color: "#111" },
  readOnlyHint: { marginTop: 4, fontWeight: "700", color: "#666", fontSize: 12 },

  langRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  langPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  langPillOn: { backgroundColor: "#000", borderColor: "#000" },
  langText: { fontWeight: "900", color: "#000" },
  langTextOn: { color: "#fff" },

  button: {
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "900" },
  error: { color: "red", marginBottom: 10, fontWeight: "700" },
});
