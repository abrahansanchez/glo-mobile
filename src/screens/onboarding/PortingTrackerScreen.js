import React, { useContext, useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import api from "../../config/api";
import OnboardingHeader from "../../onboarding/OnboardingHeader";
import AppText from "../../components/ui/AppText";
import AppButton from "../../components/ui/AppButton";
import OnboardingHero from "../../components/onboarding/OnboardingHero";
import { spacing } from "../../ui/tokens";
import { useTheme } from "../../theme/ThemeContext";

const STATUS_ORDER = ["draft", "submitted", "carrier_review", "approved", "completed", "rejected"];

export default function PortingTrackerScreen({ navigation }) {
  const { setLocalStep, navigateFromBackend } = useContext(OnboardingContext);
  const { colors, resolvedTheme } = useTheme();
  const [status, setStatus] = useState("draft");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStatus() {
    setLoading(true);
    setError("");
    try {
      await setLocalStep("porting_tracker");
      const response = await api.get("/phone/porting/status");
      const payload = response.data || {};
      setStatus(payload.status || "draft");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load port status");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <OnboardingHeader />
      <OnboardingHero
        stepLabel="Porting"
        title="Porting Status"
        subtitle={`Current status: ${status}`}
      />

      <View style={styles.timeline}>
        {STATUS_ORDER.map((item) => {
          const done = STATUS_ORDER.indexOf(item) <= STATUS_ORDER.indexOf(status) && status !== "rejected";
          const rejected = status === "rejected" && item === "rejected";
          return (
            <View
              key={item}
              style={[
                styles.stage,
                { borderColor: colors.border, backgroundColor: colors.card },
                done && { backgroundColor: resolvedTheme === "dark" ? "#12382c" : "#ecfdf5", borderColor: colors.success },
                rejected && { backgroundColor: resolvedTheme === "dark" ? "#3b1010" : "#fef2f2", borderColor: colors.danger },
              ]}
            >
              <AppText
                style={[
                  styles.stageText,
                  { color: colors.textSecondary },
                  done && { color: colors.success },
                  rejected && { color: colors.danger },
                ]}
              >
                {item}
              </AppText>
            </View>
          );
        })}
      </View>

      {!!error ? <AppText style={[styles.error, { color: colors.danger }]}>{error}</AppText> : null}
      <AppButton
        variant="primary"
        style={styles.primaryBtn}
        onPress={loadStatus}
        label={loading ? "Refreshing..." : "Refresh Status"}
      />

      <AppButton
        variant="secondary"
        style={styles.secondaryBtn}
        onPress={() => navigateFromBackend(navigation)}
        label="Continue"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  timeline: { gap: spacing.sm, marginBottom: spacing.md },
  stage: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  stageText: { fontWeight: "700", textTransform: "capitalize" },
  primaryBtn: { marginTop: spacing.sm },
  secondaryBtn: { marginTop: spacing.sm },
  error: { fontWeight: "700", marginBottom: spacing.xs },
});
