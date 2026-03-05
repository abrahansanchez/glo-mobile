import React, { useContext } from "react";
import { View, Pressable, Text, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../auth/authContext";
import { OnboardingContext } from "./OnboardingContext";

/**
 * OnboardingHeader
 * - Back only shows if navigation.canGoBack()
 * - Logout is optional (showLogout prop)
 * - Dev-only Restart resets onboarding without logging out (showRestart prop)
 */
export default function OnboardingHeader({
  showLogout = false,
  showRestart = true,
}) {
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const insets = useSafeAreaInsets();

  const { logout } = useContext(AuthContext);
  const { reset: resetOnboarding } = useContext(OnboardingContext);
  function canNavigateTo(routeName) {
    const routeNames = navigation?.getState?.()?.routeNames || [];
    return routeNames.includes(routeName);
  }

  async function handleLogout() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  }

  async function handleRestart() {
    Alert.alert(
      "Restart onboarding",
      "This will restart onboarding from the beginning (stays logged in).",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restart",
          style: "destructive",
          onPress: async () => {
            await resetOnboarding();
            if (canNavigateTo("Welcome")) {
              navigation.reset({
                index: 0,
                routes: [{ name: "Welcome" }],
              });
            } else if (canGoBack) {
              navigation.goBack();
            } else {
              navigation.navigate("Welcome");
            }
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.row, { paddingTop: Math.max(insets.top, 12) }]}>
      {/* Back (only if stack can go back) */}
      {canGoBack ? (
        <Pressable onPress={() => navigation.goBack()} style={styles.btn}>
          <Text style={styles.text}>Back</Text>
        </Pressable>
      ) : (
        <View style={styles.btnPlaceholder} />
      )}

      <View style={{ flex: 1 }} />

      {/* Dev Restart (recommended while building) */}
      {showRestart ? (
        <Pressable onPress={handleRestart} style={styles.btn}>
          <Text style={styles.text}>Restart</Text>
        </Pressable>
      ) : null}

      {/* Logout (optional) */}
      {showLogout ? (
        <Pressable onPress={handleLogout} style={[styles.btn, styles.logout]}>
          <Text style={[styles.text, styles.logoutText]}>Log out</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  btn: { padding: 8 },
  btnPlaceholder: { width: 44, height: 32 }, // keeps layout aligned
  text: { fontWeight: "700", color: "#111" },
  logout: { marginLeft: 6 },
  logoutText: { color: "#b00" },
});
