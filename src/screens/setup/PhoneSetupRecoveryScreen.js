import React, { useContext, useMemo, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { AuthContext } from "../../auth/authContext";
import { SetupModeContext } from "../../setup/SetupModeContext";
import {
  createAuthorizedSetupActionController,
  createSetupModeSignOutController,
} from "../../setup/setupModeContract";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import AppText from "../../components/ui/AppText";
import { spacing } from "../../ui/tokens";
import { useTheme } from "../../theme/ThemeContext";

export default function PhoneSetupRecoveryScreen({ navigation }) {
  const { colors } = useTheme();
  const { logout } = useContext(AuthContext);
  const { readiness, invalidateSession, refreshReadiness } = useContext(SetupModeContext);
  const [busy, setBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const state = readiness?.phone?.recoveryState || readiness?.phone?.setupState || readiness?.clientSetupState || "recovery_required";
  const forwarding = readiness?.phone?.strategy === "forward_existing";
  const actionController = createAuthorizedSetupActionController({
    readiness,
    navigate: (route) => navigation.navigate(route),
    openSupport: () => Linking.openURL("mailto:support@gloai.com"),
  });
  const { authorized } = actionController;
  const signOutController = useMemo(() => createSetupModeSignOutController({
    invalidateSetupSession: invalidateSession,
    logout,
  }), [invalidateSession, logout]);

  async function refresh() {
    if (busy) return;
    setBusy(true);
    try { await refreshReadiness(); } finally { setBusy(false); }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await signOutController.signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <AppText variant="title">Phone setup recovery</AppText>
      <AppCard style={styles.card}>
        <AppText style={styles.title}>Status</AppText>
        <AppText style={{ color: colors.textSecondary }}>{state.replace(/_/g, " ")}</AppText>
      </AppCard>
      <AppText style={[styles.copy, { color: colors.textSecondary }]}>Glō will not release a number, disable forwarding, restart verification, or retry provisioning automatically.</AppText>
      {authorized.canViewForwardingStatus && forwarding ? <AppButton label="Forwarding status and instructions" onPress={() => actionController.openForwardingStatus("ForwardingSetup")} /> : null}
      {authorized.canViewForwardingStatus && state === "verification_restart_required" ? <AppButton label="Verification recovery" onPress={() => actionController.openForwardingStatus("ForwardingVerification")} /> : null}
      <AppButton label={busy ? "Refreshing…" : "Refresh status"} variant="secondary" disabled={busy} onPress={refresh} />
      {authorized.canContactSupport ? <AppButton label="Contact support" variant="secondary" onPress={actionController.contactSupport} /> : null}
      <AppButton
        label={signingOut ? "Signing out…" : "Sign out"}
        variant="danger"
        disabled={signingOut}
        onPress={signOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 72, gap: spacing.sm },
  card: { marginVertical: spacing.md },
  title: { fontWeight: "800", marginBottom: spacing.xs },
  copy: { lineHeight: 20, marginBottom: spacing.md },
});
