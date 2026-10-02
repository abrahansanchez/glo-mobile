import React, { useContext, useMemo, useRef, useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { SetupModeContext } from "../../setup/SetupModeContext";
import {
  createAuthorizedSetupActionController,
  createSetupModeActionController,
  getSetupChecklist,
} from "../../setup/setupModeContract";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import AppText from "../../components/ui/AppText";
import { spacing } from "../../ui/tokens";
import { useTheme } from "../../theme/ThemeContext";

export default function SetupModeScreen({ navigation }) {
  const { colors } = useTheme();
  const { readiness, refreshReadiness, startPhoneSetup } = useContext(SetupModeContext);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const actionRef = useRef(false);
  const actionController = useMemo(() => createAuthorizedSetupActionController({
    readiness,
    navigate: (route) => navigation.navigate(route),
    openSupport: () => Linking.openURL("mailto:support@gloai.com"),
  }), [navigation, readiness]);
  const { authorized } = actionController;
  const startController = useMemo(() => createSetupModeActionController({
    startPhoneSetup,
    navigate: (route) => navigation.navigate(route),
  }), [navigation, startPhoneSetup]);
  const checklist = useMemo(() => getSetupChecklist(readiness), [readiness]);
  const checklistRoutes = {
    business_profile: "BusinessProfile",
    services: "SetupServices",
    business_hours: "SetupBusinessHours",
    ai_greeting_language: "SetupAI",
  };
  const completed = checklist.filter((item) => item.complete).length;
  const recovery = String(readiness?.clientSetupState || "").includes("recovery") ||
    String(readiness?.clientSetupState || "").includes("failure");

  async function handleStartPhoneSetup() {
    if (actionRef.current) return;
    actionRef.current = true;
    setBusy(true);
    setError("");
    try {
      await startController.start();
    } catch {
      setError("Phone setup is not ready yet. Refresh your setup status or contact support.");
    } finally {
      actionRef.current = false;
      setBusy(false);
    }
  }

  async function handleRefresh() {
    if (actionRef.current) return;
    actionRef.current = true;
    setBusy(true);
    setError("");
    try {
      await refreshReadiness();
    } catch {
      setError("Could not refresh setup status.");
    } finally {
      actionRef.current = false;
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <AppText variant="title" style={styles.title}>Setup Mode</AppText>
      <AppText style={[styles.subtitle, { color: colors.textSecondary }]}>Glō is not live until every required setup item is complete.</AppText>
      <AppCard style={styles.progressCard}>
        <AppText style={styles.progress}>{completed} of {checklist.length} complete</AppText>
      </AppCard>
      {checklist.map((item) => (
        <AppCard key={item.key} style={styles.itemCard}>
          <View style={styles.row}>
            <AppText style={styles.itemTitle}>{item.label}</AppText>
            <AppText style={{ color: item.complete ? colors.success : colors.warning }}>
              {item.complete ? "Complete" : "Required"}
            </AppText>
          </View>
          {!item.complete && checklistRoutes[item.key] ? (
            <AppButton
              label={`Complete ${item.label.toLowerCase()}`}
              variant="secondary"
              onPress={() => navigation.navigate(checklistRoutes[item.key], { setupMode: true })}
            />
          ) : null}
        </AppCard>
      ))}

      {recovery ? (
        <AppCard style={styles.recoveryCard}>
          <AppText style={styles.itemTitle}>Recovery required</AppText>
          <AppText style={{ color: colors.textSecondary }}>Your account remains accessible while billing or phone setup is recovered safely.</AppText>
        </AppCard>
      ) : null}
      {!!error && <AppText style={{ color: colors.danger }}>{error}</AppText>}

      {authorized.canStartPhoneSetup ? (
        <AppButton label={busy ? "Starting…" : "Start phone setup"} disabled={busy} onPress={handleStartPhoneSetup} />
      ) : null}
      {authorized.canOpenBilling ? (
        <AppButton label="Billing and trial" variant="secondary" disabled={busy} onPress={actionController.openBilling} />
      ) : null}
      {authorized.canViewForwardingStatus ? (
        <AppButton label="Phone setup status" variant="secondary" disabled={busy} onPress={actionController.openForwardingStatus} />
      ) : null}
      <AppButton label="Refresh setup status" variant="secondary" disabled={busy} onPress={handleRefresh} />
      {authorized.canContactSupport ? (
        <AppButton label="Contact support" variant="secondary" onPress={actionController.contactSupport} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 64, gap: spacing.sm },
  title: { marginBottom: spacing.xs },
  subtitle: { marginBottom: spacing.md, lineHeight: 20 },
  progressCard: { marginBottom: spacing.sm },
  progress: { fontSize: 18, fontWeight: "900" },
  itemCard: { padding: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemTitle: { fontWeight: "800" },
  recoveryCard: { marginVertical: spacing.sm },
});
