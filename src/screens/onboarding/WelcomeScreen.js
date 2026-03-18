import React from "react";
import { View, StyleSheet, Alert } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import { useContext, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { AuthContext } from "../../auth/authContext";
import api from "../../config/api";
import { STEPS } from "../../onboarding/stepKeys";
import AppText from "../../components/ui/AppText";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import OnboardingHero from "../../components/onboarding/OnboardingHero";
import { spacing } from "../../ui/tokens";
import { useTheme } from "../../theme/ThemeContext";
import { getStrings, normalizeLanguage } from "../../utils/i18n";

export default function WelcomeScreen({ navigation }) {
  const { setLocalStep, onboardingData, navigateFromBackend } = useContext(OnboardingContext);
  const { logout } = useContext(AuthContext);
  const { colors } = useTheme();
  const t = getStrings(normalizeLanguage(onboardingData?.preferredLanguage));

  function canNavigateTo(routeName) {
    const routeNames = navigation?.getState?.()?.routeNames || [];
    return routeNames.includes(routeName);
  }

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
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <OnboardingHero
        stepLabel="Step 1 of 10"
        title={t.welcomeTitle}
        subtitle={t.welcomeSubtitle}
      />

      <AppCard style={styles.bullets}>
        <AppText style={styles.bullet}>{t.welcomeBulletOne}</AppText>
        <AppText style={styles.bullet}>{t.welcomeBulletTwo}</AppText>
        <AppText style={styles.bullet}>{t.welcomeBulletThree}</AppText>
      </AppCard>

      <AppButton
        variant="primary"
        label={t.getStarted}
        style={styles.primaryBtn}
        onPress={async () => {
          await navigateFromBackend(navigation);
        }}
      />

      {__DEV__ && (
        <AppButton
          label="DEV: Reset App State"
          variant="secondary"
          style={styles.devBtn}
          onPress={handleDevReset}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  bullets: { marginBottom: spacing.lg },
  bullet: { marginBottom: spacing.xs, fontWeight: "600" },
  primaryBtn: { marginTop: spacing.sm },
  devBtn: { marginTop: spacing.sm },
});
