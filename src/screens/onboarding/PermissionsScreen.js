import React, { useContext, useState } from "react";
import { View, StyleSheet } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import { STEPS } from "../../onboarding/stepKeys";
import AppText from "../../components/ui/AppText";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import OnboardingHero from "../../components/onboarding/OnboardingHero";
import { spacing } from "../../ui/tokens";
import { useTheme } from "../../theme/ThemeContext";
import * as Notifications from "expo-notifications";
import { getStrings, normalizeLanguage } from "../../utils/i18n";

export default function PermissionsScreen({ navigation }) {
  const { updateStep, navigateFromBackend, onboardingData } = useContext(OnboardingContext);
  const { colors } = useTheme();
  const t = getStrings(normalizeLanguage(onboardingData?.preferredLanguage));
  const [requesting, setRequesting] = useState(false);

  const permissions = [
    {
      key: "notifications",
      icon: "🔔",
      title: t.permissionsNotificationsTitle,
      desc: t.permissionsNotificationsDesc,
    },
    {
      key: "microphone",
      icon: "🎙️",
      title: t.permissionsMicrophoneTitle,
      desc: t.permissionsMicrophoneDesc,
    },
    {
      key: "contacts",
      icon: "👥",
      title: t.permissionsContactsTitle,
      desc: t.permissionsContactsDesc,
    },
  ];

  async function handleAllowAll() {
    setRequesting(true);
    try {
      await Notifications.requestPermissionsAsync();
    } catch (e) {}
    try {
      const { Audio } = await import("expo-av");
      await Audio.requestPermissionsAsync();
    } catch (e) {}
    try {
      const Contacts = await import("expo-contacts");
      await Contacts.requestPermissionsAsync();
    } catch (e) {}
    await updateStep(STEPS.PERMISSIONS);
    await navigateFromBackend(navigation);
    setRequesting(false);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <OnboardingHero
        stepLabel="Step 7 of 9"
        title={t.permissionsTitle}
        subtitle={t.permissionsSubtitle}
      />
      {permissions.map((permission) => (
        <AppCard key={permission.key} style={styles.card}>
          <View style={styles.row}>
            <AppText style={styles.icon}>{permission.icon}</AppText>
            <View style={styles.text}>
              <AppText style={styles.pTitle}>{permission.title}</AppText>
              <AppText style={[styles.pDesc, { color: colors.textSecondary }]}>
                {permission.desc}
              </AppText>
            </View>
          </View>
        </AppCard>
      ))}
      <AppButton
        variant="primary"
        label={requesting ? t.settingUp : t.allowAllContinue}
        style={styles.btn}
        onPress={handleAllowAll}
        disabled={requesting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "flex-start", paddingTop: spacing.xl },
  card: { marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { fontSize: 20 },
  text: { flex: 1 },
  pTitle: { fontSize: 13, fontWeight: "600", marginBottom: 2 },
  pDesc: { fontSize: 12, fontWeight: "300", lineHeight: 17 },
  btn: { marginTop: spacing.md },
});
