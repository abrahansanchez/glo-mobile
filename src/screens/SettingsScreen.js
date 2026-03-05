import React, { useContext, useEffect, useState } from "react";
import { View, Pressable, StyleSheet, Alert, Linking } from "react-native";
import api from "../config/api";
import { AuthContext } from "../auth/authContext";
import ScreenContainer from "../components/layout/ScreenContainer";
import AppCard from "../components/ui/AppCard";
import AppBadge from "../components/ui/AppBadge";
import AppText from "../components/ui/AppText";
import AppButton from "../components/ui/AppButton";
import { colors, spacing } from "../ui/tokens";
import {
  FEATURE_FLAGS,
  getEliteOnboardingFlag,
  setEliteOnboardingFlag,
} from "../config/featureFlags";
import { useIsAdmin } from "../auth/adminAccess";

export default function SettingsScreen({ navigation }) {
  const { logout, stripeCustomerId } = useContext(AuthContext);
  const isAdmin = useIsAdmin();

  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState(null);
  const [error, setError] = useState("");
  const [eliteOnboardingEnabled, setEliteOnboardingEnabled] = useState(FEATURE_FLAGS.ELITE_ONBOARDING);
  const [flagBusy, setFlagBusy] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, []);

  useEffect(() => {
    if (!__DEV__) return;
    let cancelled = false;
    (async () => {
      const enabled = await getEliteOnboardingFlag();
      if (!cancelled) setEliteOnboardingEnabled(enabled);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadSubscription() {
    try {
      setLoading(true);
      setError("");

      // TODO (M6.1-B): Confirm REAL backend endpoint on Windows laptop and update path
      const res = await api.get("/billing/status");

      setSub(res.data);
    } catch (e) {
      setError(
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        "Failed to load billing status"
      );
    } finally {
      setLoading(false);
    }
  }

  async function openBillingPortal() {
    if (!canManageBilling) {
      Alert.alert("Billing", "Billing portal will be available after your billing profile is created.");
      return;
    }

    try {
      const res = await api.post("/billing/portal");

      const url = res.data?.url;
      if (!url) {
        Alert.alert("Billing", "No billing portal URL returned.");
        return;
      }

      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert("Billing", "Unable to open billing portal on this device.");
        return;
      }

      await Linking.openURL(url);
    } catch (e) {
      const code = e?.response?.data?.error || e?.response?.data?.code;
      if (code === "BILLING_NOT_AVAILABLE" || code === "NO_STRIPE_CUSTOMER") {
        Alert.alert("Billing", "Billing portal is not available yet. Please try again shortly.");
        return;
      }
      if (code === "CONFIG_MISSING_RETURN_URL" || /stripe|return[_\s-]?url/i.test(String(e?.response?.data?.message || ""))) {
        Alert.alert("Billing", "Billing is temporarily unavailable. Try again later.");
        return;
      }
      Alert.alert(
        "Billing",
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Failed to open billing portal"
      );
    }
  }

  async function toggleEliteOnboarding() {
    if (!__DEV__) return;
    try {
      setFlagBusy(true);
      const nextValue = !eliteOnboardingEnabled;
      const persisted = await setEliteOnboardingFlag(nextValue);
      setEliteOnboardingEnabled(persisted);
      Alert.alert(
        "Feature flag updated",
        `Elite onboarding is now ${persisted ? "ON" : "OFF"}. Restart onboarding (or re-login) to verify flow routing.`
      );
    } catch {
      Alert.alert("Feature flags", "Unable to update feature flag.");
    } finally {
      setFlagBusy(false);
    }
  }

  function canNavigateTo(routeName) {
    const routeNames = navigation?.getState?.()?.routeNames || [];
    return routeNames.includes(routeName);
  }

  function openAccount() {
    if (canNavigateTo("Account")) {
      navigation.navigate("Account");
      return;
    }
    Alert.alert("Navigation", "Account screen is unavailable in this build.");
  }

  function openPortingStatus() {
    if (canNavigateTo("PortingStatus")) {
      navigation.navigate("PortingStatus");
      return;
    }
    if (canNavigateTo("PortingForm")) {
      navigation.navigate("PortingForm");
      return;
    }
    Alert.alert("Navigation", "Porting screen is unavailable in this build.");
  }

  function formatDate(d) {
    if (!d) return "—";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleDateString();
  }

  const status =
    sub?.subscription?.status ||
    sub?.subscriptionStatus ||
    (sub?.isSubscribed ? "active" : "none");

  // Backend returns startedAt + canceledAt.
  // We'll show canceledAt if present, else startedAt as a fallback "since" date.
  const endsAt =
    sub?.subscription?.canceledAt ||
    sub?.subscription?.startedAt ||
    null;
  const effectiveStripeCustomerId =
    stripeCustomerId ||
    sub?.stripeCustomerId ||
    sub?.subscription?.stripeCustomerId ||
    null;
  const canManageBilling = typeof effectiveStripeCustomerId === "string" && effectiveStripeCustomerId.startsWith("cus_");

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <AppText variant="title" style={styles.title}>Settings</AppText>

      <AppCard style={styles.card}>
        <AppText variant="section" style={styles.cardTitle}>Subscription</AppText>
        <AppBadge
          label={String(status).toUpperCase()}
          tone={status === "active" ? "success" : "warning"}
          style={styles.statusBadge}
        />

        {loading ? (
          <AppText style={styles.text}>Loading…</AppText>
        ) : error ? (
          <AppText style={[styles.text, styles.error]}>{error}</AppText>
        ) : (
          <>
            <AppText style={styles.text}>Status: <AppText style={styles.bold}>{String(status)}</AppText></AppText>
            <AppText style={styles.text}>Ends: <AppText style={styles.bold}>{formatDate(endsAt)}</AppText></AppText>
          </>
        )}

        {!canManageBilling ? (
          <AppText variant="caption" style={styles.helperText}>
            Billing portal will unlock after Stripe customer setup completes.
          </AppText>
        ) : null}

        <AppButton
          label="Manage Billing"
          onPress={openBillingPortal}
          variant="primary"
          style={styles.btn}
        />
      </AppCard>

      <AppCard style={styles.card}>
        <AppText variant="section" style={styles.cardTitle}>Account</AppText>

        <AppButton
          label="Account"
          variant="secondary"
          style={styles.actionBtn}
          onPress={openAccount}
        />

        <AppButton
          label="Porting Status"
          variant="secondary"
          style={styles.actionBtn}
          onPress={openPortingStatus}
        />

        <AppButton
          label="Log out"
          variant="danger"
          style={styles.btn}
          onPress={() =>
            Alert.alert("Log out", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              { text: "Log out", style: "destructive", onPress: logout },
            ])
          }
        />
      </AppCard>

      {__DEV__ && isAdmin ? (
        <AppCard style={styles.card}>
          <AppText variant="section" style={styles.cardTitle}>Feature Flags (Dev)</AppText>

          <Pressable style={styles.rowButton} onPress={toggleEliteOnboarding} disabled={flagBusy}>
            <AppText style={styles.rowText}>
              Elite Onboarding: {eliteOnboardingEnabled ? "ON" : "OFF"}
            </AppText>
            <AppText variant="caption" style={styles.helperText}>
              Tap to toggle rollout. Hidden in production builds.
            </AppText>
          </Pressable>
        </AppCard>
      ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { marginBottom: spacing.md },
  card: { marginBottom: spacing.md },
  cardTitle: { marginBottom: spacing.sm },
  statusBadge: { marginBottom: spacing.sm },
  text: { marginBottom: spacing.xs },
  bold: { fontWeight: "900" },
  error: { color: colors.danger },
  btn: {
    marginTop: spacing.sm,
  },
  helperText: { marginBottom: 2, color: colors.textMuted },
  rowButton: { paddingVertical: 12 },
  rowText: { fontSize: 16, color: colors.textPrimary, fontWeight: "700", marginBottom: 6 },
  actionBtn: { marginBottom: spacing.sm },
});
