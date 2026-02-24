import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function IncomingCallOverlay({ visible, invite, onAnswer, onLetAiHandle, actionInProgress }) {
  if (!visible) {
    return null;
  }

  const callerNumber = invite?.call_from || invite?.from || "Unknown caller";

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>Incoming Call</Text>
        <Text style={styles.callerLabel}>Caller</Text>
        <Text style={styles.callerValue}>{callerNumber}</Text>

        <View style={styles.actions}>
          <Pressable style={[styles.button, styles.answer]} onPress={onAnswer} disabled={actionInProgress}>
            <Text style={styles.buttonText}>Answer</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.ai]} onPress={onLetAiHandle} disabled={actionInProgress}>
            <Text style={styles.buttonText}>Let AI Handle</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    elevation: 999,
  },
  card: {
    width: "90%",
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  callerLabel: {
    fontSize: 14,
    color: "#666",
  },
  callerValue: {
    fontSize: 20,
    fontWeight: "600",
  },
  actions: {
    marginTop: 12,
    gap: 10,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  answer: {
    backgroundColor: "#1a8f3b",
  },
  ai: {
    backgroundColor: "#1f2937",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

