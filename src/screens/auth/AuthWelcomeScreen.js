import React from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import api from "../../config/api";
import { useTheme } from "../../theme/ThemeContext";

export default function AuthWelcomeScreen({ navigation }) {
  const { colors } = useTheme();

  const handleDevReset = async () => {
    if (!__DEV__) return; // Only available in dev mode
    Alert.alert(
      "Reset App State (DEV ONLY)",
      "This will wipe all auth, barber, and onboarding data.",
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
              Alert.alert("Success", "App state wiped. Reload the app.");
            } catch (e) {
              Alert.alert("Error", e.message);
            }
          },
        },
      ]
    );
  };
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Glō</Text>

      <Text style={[styles.headline, { color: colors.textPrimary }]}>
        Glō answers your calls and books clients for you.
      </Text>

      <View style={styles.bullets}>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• No missed calls while you're cutting</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Clients book/cancel/reschedule automatically</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Works even after hours</Text>
      </View>

      <Pressable
        style={[styles.button, styles.primary, { backgroundColor: colors.accent, borderColor: colors.accentBorder }]}
        onPress={() => navigation.navigate("Register")}
      >
        <Text style={[styles.primaryText, { color: colors.bg }]}>Get Started</Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.secondary, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => navigation.navigate("Login")}
      >
        <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>Log In</Text>
      </Pressable>

      {__DEV__ && (
        <Pressable
          style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 }]}
          onPress={handleDevReset}
        >
          <Text style={{ color: colors.danger, fontWeight: "700", fontSize: 12 }}>
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
  bullet: { fontSize: 15, marginBottom: 8 },
  button: { paddingVertical: 14, borderRadius: 12, alignItems: "center", marginBottom: 12, borderWidth: 0.5 },
  primary: {},
  primaryText: { fontWeight: "800" },
  secondary: {},
  secondaryText: { fontWeight: "800" },
});
