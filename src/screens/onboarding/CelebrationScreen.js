import React, { useContext, useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import { STEPS } from "../../onboarding/stepKeys";
import AppText from "../../components/ui/AppText";
import AppButton from "../../components/ui/AppButton";
import { spacing } from "../../ui/tokens";
import { useTheme } from "../../theme/ThemeContext";
import { getStrings, normalizeLanguage } from "../../utils/i18n";

export default function CelebrationScreen({ navigation }) {
  const { updateStep, navigateFromBackend, onboardingData } = useContext(OnboardingContext);
  const { colors } = useTheme();
  const t = getStrings(normalizeLanguage(onboardingData?.preferredLanguage));
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const barberName = onboardingData?.barberName || onboardingData?.shopName || "";
  const gloNumber = onboardingData?.twilioNumber || onboardingData?.assignedTwilioNumber || "";

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  async function handleGoToDashboard() {
    await updateStep(STEPS.CELEBRATION);
    await navigateFromBackend(navigation);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Animated.View style={[styles.ringWrap, { transform: [{ scale: scaleAnim }] }]}>
        <View style={[styles.ring, { borderColor: "rgba(210,235,255,0.7)" }]}>
          <View style={[styles.ringInner, { borderColor: "rgba(210,235,255,0.2)" }]}>
            <AppText style={[styles.check, { color: "rgba(210,235,255,0.9)" }]}>✓</AppText>
          </View>
        </View>
      </Animated.View>
      <AppText variant="title" style={[styles.title, { color: colors.textPrimary }]}>
        {t.celebrationTitle}
      </AppText>
      {!!barberName && (
        <AppText style={[styles.sub, { color: colors.textSecondary }]}>
          {t.celebrationPersonalized.replace("{name}", barberName)}
        </AppText>
      )}
      {!!gloNumber && (
        <View style={[styles.numCard, { borderColor: "rgba(255,255,255,0.07)" }]}>
          <AppText style={[styles.numLabel, { color: colors.textSecondary }]}>
            {t.celebrationNumberLabel}
          </AppText>
          <AppText style={[styles.num, { color: colors.textPrimary }]}>
            {gloNumber}
          </AppText>
        </View>
      )}
      <AppText style={[styles.hint, { color: colors.textSecondary }]}>
        {t.celebrationSubtitle}
      </AppText>
      <AppButton
        variant="primary"
        label={t.celebrationBtn}
        style={styles.btn}
        onPress={handleGoToDashboard}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", alignItems: "center" },
  ringWrap: { marginBottom: spacing.xl },
  ring: { width: 80, height: 80, borderRadius: 40, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  ringInner: { width: 56, height: 56, borderRadius: 28, borderWidth: 0.5, alignItems: "center", justifyContent: "center" },
  check: { fontSize: 24, fontWeight: "300" },
  title: { textAlign: "center", marginBottom: spacing.sm },
  sub: { textAlign: "center", marginBottom: spacing.xl, fontSize: 14, fontWeight: "300", lineHeight: 20 },
  numCard: { borderWidth: 0.5, borderRadius: 12, padding: spacing.lg, alignItems: "center", marginBottom: spacing.xl, width: "100%" },
  numLabel: { fontSize: 11, fontWeight: "500", marginBottom: spacing.xs, letterSpacing: 0.5 },
  num: { fontSize: 22, fontWeight: "600", letterSpacing: 0.5 },
  hint: { textAlign: "center", fontSize: 13, fontWeight: "300", marginBottom: spacing.xl, lineHeight: 19 },
  btn: { width: "100%" },
});
