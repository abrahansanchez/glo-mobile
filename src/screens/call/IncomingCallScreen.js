import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function IncomingCallScreen({ navigation, route }) {
  // Mock data for now (later comes from push / backend)
  const caller = route?.params?.caller ?? "Unknown Caller";

  function handleManualAnswer() {
    console.log("[CALL] Answer manually clicked");

    // 🔑 IMPORTANT: Navigate via the parent navigator (CallFlow)
    navigation.replace("CallFlow", {
      screen: "CallEnded",
      params: { outcome: "manual" },
    });
  }

  function handleAIHandle() {
    console.log("[CALL] Let AI handle clicked");

    // 🔑 IMPORTANT: Navigate via the parent navigator (CallFlow)
    navigation.replace("CallFlow", {
      screen: "CallEnded",
      params: { outcome: "ai" },
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Incoming Call</Text>
      <Text style={styles.caller}>{caller}</Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.answer]}
          onPress={handleManualAnswer}
        >
          <Text style={styles.buttonText}>Answer Manually</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.ai]}
          onPress={handleAIHandle}
        >
          <Text style={styles.buttonText}>Let AI Handle</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
  },
  caller: {
    fontSize: 18,
    color: "#bbb",
    marginBottom: 40,
  },
  actions: {
    width: "100%",
  },
  button: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    alignItems: "center",
  },
  answer: {
    backgroundColor: "#1DB954",
  },
  ai: {
    backgroundColor: "#444",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
