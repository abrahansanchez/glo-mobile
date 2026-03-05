import React, { useState, useEffect } from "react";
import { View, Button, StyleSheet, TextInput, Alert, ScrollView } from "react-native";
import { Audio } from "expo-av";
import { useVoice } from "../voice/VoiceContext";
import { initTwilioVoice, startCall, endCall } from "../voice/twilioVoiceService";
import ScreenContainer from "../components/layout/ScreenContainer";
import AppText from "../components/ui/AppText";
import { useTheme } from "../theme/ThemeContext";

export default function CallsScreen() {
  const { colors } = useTheme();
  const { status, token, identity, refreshToken } = useVoice();
  const [to, setTo] = useState("");
  const [twilioInitialized, setTwilioInitialized] = useState(false);
  const [deviceReadyFlag, setDeviceReadyFlag] = useState(false);

  useEffect(() => {
    console.log("[VOICE] CallsScreen status:", status);
  }, [status]);

  const ensureMicPermission = async () => {
    const { status: micStatus } = await Audio.requestPermissionsAsync();
    console.log("[MIC] permission status:", micStatus);

    if (micStatus !== "granted") {
      Alert.alert(
        "Microphone Permission Required",
        "Please allow microphone access in iOS Settings to initialize Twilio Voice and place calls."
      );
      return false;
    }

    return true;
  };

  const handleInit = async () => {
    try {
      setTwilioInitialized(false);
      setDeviceReadyFlag(false);

      const hasMicPermission = await ensureMicPermission();
      if (!hasMicPermission) {
        return;
      }

      if (!token) {
        Alert.alert("Error", "No voice token available. Please refresh.");
        return;
      }
      await initTwilioVoice(token, {
        onDeviceReady: () => {
          console.log("[TWILIO_VOICE][UI] deviceReady callback fired");
          setDeviceReadyFlag(true);
        },
        onDeviceNotReady: (payload) => {
          console.log("[TWILIO_VOICE][UI] deviceNotReady callback payload:", payload);
          setDeviceReadyFlag(false);
          const errText =
            payload?.err ||
            payload?.error ||
            (typeof payload === "string" ? payload : JSON.stringify(payload));
          Alert.alert("Twilio Device Not Ready", errText || "Unknown Twilio device error");
        },
      });
      setTwilioInitialized(true);
      Alert.alert("Twilio Voice", "Initialized ✅");
    } catch (e) {
      setTwilioInitialized(false);
      setDeviceReadyFlag(false);
      Alert.alert("Init failed", e?.message || "Unknown error");
    }
  };

  const handleCall = async () => {
    try {
      const hasMicPermission = await ensureMicPermission();
      if (!hasMicPermission) {
        return;
      }

      if (!twilioInitialized) {
        Alert.alert("Error", "Initialize Twilio Voice before starting a call.");
        return;
      }

      if (!to.trim()) {
        Alert.alert("Error", "Please enter a number (e.g., 8132207636 or +18132207636)");
        return;
      }
      await startCall(to);
      Alert.alert("Calling", "Attempting to reach " + to + "...\n\nTap 'Hang Up' to end the call.");
    } catch (e) {
      Alert.alert("Call failed", e?.message || "Unknown error");
    }
  };

  const handleHangup = async () => {
    try {
      endCall();
      Alert.alert("Call", "Call ended");
    } catch (e) {
      Alert.alert("Hangup failed", e?.message || "Unknown error");
    }
  };

  const canStartCall = twilioInitialized;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <AppText variant="title" style={styles.title}>Calls</AppText>

        <AppText variant="section" style={styles.subtitle}>Voice Token Status</AppText>
        <AppText style={styles.line}>Voice status: {status}</AppText>
        <AppText style={styles.line}>Token present: {token ? "Yes" : "No"}</AppText>
        <AppText style={styles.line}>Identity: {identity || "none"}</AppText>
        <AppText style={styles.line}>Twilio initialized: {twilioInitialized ? "Yes" : "No"}</AppText>
        <AppText style={styles.line}>Twilio deviceReady: {deviceReadyFlag ? "Yes" : "No"}</AppText>

        <View style={{ height: 20 }} />

        <Button title="Refresh Voice Token" onPress={refreshToken} />
        <View style={{ height: 12 }} />
        <Button title="Initialize Twilio Voice" onPress={handleInit} />

        <View style={{ height: 24 }} />

        <AppText variant="section" style={styles.subtitle}>Make a Test Call</AppText>
        <TextInput
          value={to}
          onChangeText={setTo}
          placeholder="Enter number (8132207636 or +1...)"
          autoCapitalize="none"
          keyboardType="phone-pad"
          style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.card }]}
          placeholderTextColor={colors.textMuted}
        />

        <View style={{ height: 12 }} />
        <Button title="Start Outgoing Call" onPress={handleCall} disabled={!canStartCall} />
        <View style={{ height: 12 }} />
        <Button title="Hang Up" onPress={handleHangup} color="red" />

        <View style={{ height: 24 }} />
        <AppText variant="caption" style={styles.note}>
          Phase A: Outgoing calls only (no VoIP push yet).{"\n"}
          • Tap "Start Outgoing Call" to place a call{"\n"}
          • Call will keep ringing until recipient answers or you tap "Hang Up"{"\n"}
          • Watch terminal logs for [TWILIO_VOICE][EVENT] messages
        </AppText>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 12,
  },
  subtitle: { marginTop: 16, marginBottom: 8 },
  line: {
    fontSize: 14,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginTop: 8,
  },
  note: {
    fontSize: 12,
    marginTop: 16,
    lineHeight: 18,
  },
});
