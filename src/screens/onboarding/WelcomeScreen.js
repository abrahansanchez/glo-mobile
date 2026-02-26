import React from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import { useContext, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { AuthContext } from "../../auth/authContext";
import api from "../../config/api";
import { STEPS } from "../../onboarding/stepKeys";

export default function WelcomeScreen({ navigation }) {
  const { updateStep, setLocalStep } = useContext(OnboardingContext);
  const { logout } = useContext(AuthContext);

  useEffect(() => {
    setLocalStep(STEPS.WELCOME);
  }, [setLocalStep]);

  const handleDevReset = async () => {
    if (!__DEV__) return;
    Alert.alert(
      "Reset App State (DEV ONLY)",
      "This will wipe all data and logout.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync("glo_auth_token");
              await SecureStore.deleteItemAsync("glo_barber");
              await SecureStore.deleteItemAsync("glo_onboarding_complete_null");
              await SecureStore.deleteItemAsync("glo_onboarding_step_null");
              await SecureStore.deleteItemAsync("glo_onboarding_data_null");
              try {
                delete api.defaults.headers.common.Authorization;
              } catch (e) {}
              await logout();
              Alert.alert("Success", "App state wiped.");
            } catch (e) {
              Alert.alert("Error", e.message);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Glō</Text>

      <Text style={styles.headline}>
        Glō answers your calls and books clients for you.
      </Text>

      <View style={styles.bullets}>
        <Text style={styles.bullet}>• No missed calls while you’re cutting</Text>
        <Text style={styles.bullet}>• Clients book/cancel/reschedule automatically</Text>
        <Text style={styles.bullet}>• Works even after hours</Text>
      </View>

      <Pressable
        style={[styles.button, styles.primary]}
        onPress={async () => {
          await updateStep(STEPS.WELCOME);
          navigation.navigate("Account");
        }}
      >
        <Text style={styles.primaryText}>Get Started</Text>
      </Pressable>

      {__DEV__ && (
        <Pressable
          style={[styles.button, { backgroundColor: "#fee", marginTop: 16 }]}
          onPress={handleDevReset}
        >
          <Text style={{ color: "#c33", fontWeight: "700", fontSize: 12 }}>
            DEV: Reset App State
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 40, fontWeight: "900", marginBottom: 12 },
  headline: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  bullets: { marginBottom: 26 },
  bullet: { fontSize: 15, marginBottom: 8, color: "#333" },
  button: { paddingVertical: 14, borderRadius: 12, alignItems: "center", marginBottom: 12 },
  primary: { backgroundColor: "#000" },
  primaryText: { color: "#fff", fontWeight: "800" },
  secondary: { backgroundColor: "#eee" },
  secondaryText: { color: "#000", fontWeight: "800" },
});
