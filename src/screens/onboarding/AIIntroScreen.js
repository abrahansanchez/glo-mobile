import React, { useContext, useEffect, useRef, useState } from "react";
import { View, StyleSheet, Animated, Pressable } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import api from "../../config/api";
import { STEPS } from "../../onboarding/stepKeys";
import AppText from "../../components/ui/AppText";
import AppButton from "../../components/ui/AppButton";
import OnboardingHero from "../../components/onboarding/OnboardingHero";
import { spacing } from "../../ui/tokens";
import { useTheme } from "../../theme/ThemeContext";
import { getStrings, normalizeLanguage } from "../../utils/i18n";

export default function AIIntroScreen({ navigation }) {
  const { updateStep, navigateFromBackend, onboardingData, setLocalStep } = useContext(OnboardingContext);
  const { colors } = useTheme();
  const t = getStrings(normalizeLanguage(onboardingData?.preferredLanguage));
  const [calling, setCalling] = useState(false);
  const [error, setError] = useState("");
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setLocalStep(STEPS.AI_INTRO);
    startPulse();
  }, []);

  function startPulse() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }

  async function handleDemoCall() {
    setCalling(true);
    setError("");
    try {
      await api.post("/onboarding/demo-call");
      await new Promise(resolve => setTimeout(resolve, 20000));
      await updateStep(STEPS.AI_INTRO);
      await navigateFromBackend(navigation);
    } catch (e) {
      setError(t.aiIntroError);
      setCalling(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <OnboardingHero
        stepLabel="Step 5 of 9"
        title={t.aiIntroTitle}
        subtitle={t.aiIntroSubtitle}
      />
      <View style={styles.avatarContainer}>
        <Animated.View
          style={[
            styles.avatarOuter,
            { borderColor: colors.textPrimary, transform: [{ scale: pulseAnim }] },
          ]}
        >
          <View style={[styles.avatarInner, { backgroundColor: colors.textPrimary }]}>
            <AppText style={[styles.avatarText, { color: colors.bg }]}>AI</AppText>
          </View>
        </Animated.View>
      </View>
      {!!error && <AppText style={[styles.error, { color: colors.danger }]}>{error}</AppText>}
      <AppButton
        variant="primary"
        label={calling ? "Your phone is ringing..." : (t.aiIntroCallBtn || "Call me now")}
        style={styles.primaryBtn}
        onPress={handleDemoCall}
        disabled={calling}
      />
      <Pressable
        onPress={async () => {
          await updateStep(STEPS.AI_INTRO);
          await navigateFromBackend(navigation);
        }}
        style={styles.skipBtn}
      >
        <AppText style={[styles.skipText, { color: colors.textSecondary }]}>
          Continue
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "flex-start", paddingTop: spacing.xl },
  avatarContainer: { alignItems: "center", marginVertical: spacing.xxl },
  avatarOuter: { width: 120, height: 120, borderRadius: 60, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  avatarInner: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 22, fontWeight: "300", letterSpacing: 1 },
  primaryBtn: { marginTop: spacing.sm },
  skipBtn: { alignItems: "center", marginTop: spacing.lg },
  skipText: { fontSize: 13, fontWeight: "300" },
  error: { textAlign: "center", marginBottom: spacing.sm, fontSize: 13 },
});
