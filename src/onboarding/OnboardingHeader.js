import React, { useContext } from "react";
import { View, Pressable, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../auth/authContext";
import { OnboardingContext } from "./OnboardingContext";
import { ONBOARDING_SCREEN_MAP } from "../navigation/onboardingScreenMap";
import AppText from "../components/ui/AppText";
import { useTheme } from "../theme/ThemeContext";

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
  const { colors } = useTheme();

  const { logout } = useContext(AuthContext);
  const { reset: resetOnboarding } = useContext(OnboardingContext);
  const welcomeScreen = ONBOARDING_SCREEN_MAP.welcome;
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
            if (canNavigateTo(welcomeScreen)) {
              navigation.reset({
                index: 0,
                routes: [{ name: welcomeScreen }],
              });
            } else if (canGoBack) {
              navigation.goBack();
            } else {
              navigation.navigate(welcomeScreen);
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
          <AppText style={[styles.text, { color: colors.textPrimary }]}>Back</AppText>
        </Pressable>
      ) : (
        <View style={styles.btnPlaceholder} />
      )}

      <View style={{ flex: 1 }} />

      {/* Dev Restart (recommended while building) */}
      {showRestart ? (
        <Pressable onPress={handleRestart} style={styles.btn}>
          <AppText style={[styles.text, { color: colors.textPrimary }]}>Restart</AppText>
        </Pressable>
      ) : null}

      {/* Logout (optional) */}
      {showLogout ? (
        <Pressable onPress={handleLogout} style={[styles.btn, styles.logout]}>
          <AppText style={[styles.text, { color: colors.danger }]}>Log out</AppText>
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
  text: { fontWeight: "700" },
  logout: { marginLeft: 6 },
});
