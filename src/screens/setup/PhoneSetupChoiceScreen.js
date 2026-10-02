import React, { useContext, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import { SetupModeContext } from "../../setup/SetupModeContext";
import {
  buildPhoneStrategyRequest,
  getAuthorizedSetupActions,
  PHONE_SETUP_STRATEGIES,
  submitPhoneStrategyChoice,
} from "../../setup/setupModeContract";
import { normalizeE164, parseForwardingResponse } from "../../phone/forwardingContract";
import api from "../../config/api";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import AppText from "../../components/ui/AppText";
import { spacing } from "../../ui/tokens";
import { useTheme } from "../../theme/ThemeContext";

const LABELS = {
  new_number: "Get a new Glō number",
  forward_existing: "Keep my number and forward calls",
};
const OPTIONS = PHONE_SETUP_STRATEGIES.map((key) => ({ key, label: LABELS[key] }));

export default function PhoneSetupChoiceScreen({ navigation }) {
  const { colors } = useTheme();
  const { onboardingData, replaceAuthenticatedForwardingStatus } = useContext(OnboardingContext);
  const { phoneSetupIntentId, readiness, refreshReadiness } = useContext(SetupModeContext);
  const authorized = getAuthorizedSetupActions(readiness);
  const [choice, setChoice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitRef = useRef(false);

  async function continueWithChoice() {
    if (submitRef.current) return;
    if (!authorized.canChooseStrategy) {
      setError("Phone setup choices are not available yet.");
      return;
    }
    const payload = buildPhoneStrategyRequest(
      choice,
      phoneSetupIntentId,
      normalizeE164(onboardingData?.forwardFromNumber || onboardingData?.phoneNumber),
      onboardingData?.forwardingCarrier
    );
    if (!payload) {
      setError(choice === "forward_existing" ? "Confirm a valid business number first." : "Choose a phone setup option.");
      return;
    }
    submitRef.current = true;
    setBusy(true);
    setError("");
    try {
      await submitPhoneStrategyChoice(api, payload);
      if (choice === "forward_existing") {
        const status = await api.get("/phone/forwarding/status");
        replaceAuthenticatedForwardingStatus(parseForwardingResponse(status));
        navigation.navigate("ForwardingSetup");
      } else {
        await refreshReadiness();
        navigation.navigate("SetupModeHome");
      }
    } catch {
      setError("Could not save this phone setup choice. Please try again.");
    } finally {
      submitRef.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <AppText variant="title" style={styles.title}>Choose phone setup</AppText>
      <AppText style={[styles.subtitle, { color: colors.textSecondary }]}>No number is provisioned until you choose an option.</AppText>
      {authorized.canChooseStrategy ? OPTIONS.map((option) => (
        <Pressable key={option.key} onPress={() => setChoice(option.key)}>
          <AppCard style={[styles.card, choice === option.key && { borderWidth: 2, borderColor: colors.textPrimary }]}>
            <AppText style={styles.option}>{option.label}</AppText>
          </AppCard>
        </Pressable>
      )) : null}
      {!!error && <AppText style={{ color: colors.danger }}>{error}</AppText>}
      {authorized.canChooseStrategy ? (
        <AppButton label={busy ? "Saving…" : "Continue"} disabled={busy || !choice} onPress={continueWithChoice} />
      ) : null}
    </View>
  );
}

export { OPTIONS as PHONE_SETUP_OPTIONS };

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 72 },
  title: { marginBottom: spacing.xs },
  subtitle: { marginBottom: spacing.lg },
  card: { marginBottom: spacing.sm },
  option: { fontSize: 16, fontWeight: "800" },
});
