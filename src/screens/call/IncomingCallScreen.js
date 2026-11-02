import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useCallManager } from "../../voice/CallManager";

export default function IncomingCallScreen() {
  const { incomingInvite, actionInProgress, answerIncomingCall, letAiHandleIncomingCall } = useCallManager();
  const caller = incomingInvite?.call_from || incomingInvite?.from || "Unknown Caller";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Incoming Call</Text>
      <Text style={styles.caller}>{caller}</Text>

      {!incomingInvite ? (
        <Text style={styles.unavailable}>This call is no longer ringing.</Text>
      ) : <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.answer]}
          onPress={answerIncomingCall}
          disabled={actionInProgress}
        >
          <Text style={styles.buttonText}>Answer Manually</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.ai]}
          onPress={letAiHandleIncomingCall}
          disabled={actionInProgress}
        >
          <Text style={styles.buttonText}>Let AI Handle</Text>
        </TouchableOpacity>
      </View>}
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
  unavailable: { color: "#bbb", fontSize: 16 },
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
