import React, { useContext, useEffect, useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import api from "../../config/api";
import OnboardingHeader from "../../onboarding/OnboardingHeader";
import AppCard from "../../components/ui/AppCard";
import AppText from "../../components/ui/AppText";
import AppBadge from "../../components/ui/AppBadge";
import { colors, spacing } from "../../ui/tokens";

export default function PortingFormScreen({ navigation, route }) {
  const { setLocalStep } = useContext(OnboardingContext);
  const [form, setForm] = useState({
    phoneNumber: "",
    carrier: "",
    accountNumber: "",
    pin: "",
    billingZip: "",
    contactName: "",
    contactEmail: "",
  });
  const [loading, setLoading] = useState(false);
  const [skipLoading, setSkipLoading] = useState(false);
  const [checkingSkipPolicy, setCheckingSkipPolicy] = useState(true);
  const [skipAllowed, setSkipAllowed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    hydratePrefill();
    hydrateSkipPolicy();
  }, []);

  async function hydratePrefill() {
    const fromRoute = normalizePrefill(route?.params?.prefill);
    if (fromRoute) {
      setForm((prev) => ({ ...prev, ...fromRoute }));
      return;
    }
    try {
      const response = await api.get("/phone/porting/status");
      const payload = response.data || {};
      const prefill = normalizePrefill(payload?.details || payload?.request || payload);
      if (prefill) {
        setForm((prev) => ({ ...prev, ...prefill }));
      }
    } catch {
      // best effort only
    }
  }

  function normalizePrefill(source) {
    if (!source || typeof source !== "object") return null;
    return {
      phoneNumber: source.phoneNumber || source.phone || "",
      carrier: source.carrier || "",
      accountNumber: source.accountNumber || "",
      pin: source.pin || source.passcode || "",
      billingZip: source.billingZip || source.zip || "",
      contactName: source.contactName || source.authorizedName || source.name || "",
      contactEmail: source.contactEmail || source.email || "",
    };
  }

  function resolveSkipPolicy(payload) {
    const explicit =
      payload?.policies?.portingSkippable ??
      payload?.policy?.portingSkippable ??
      payload?.rules?.allowPortingSkip ??
      payload?.porting?.allowSkip ??
      payload?.porting?.skippable ??
      payload?.launchPolicy?.allowTemporaryNumber;

    if (typeof explicit === "boolean") {
      return explicit;
    }

    return false;
  }

  async function hydrateSkipPolicy() {
    setCheckingSkipPolicy(true);
    try {
      const response = await api.get("/onboarding/status");
      setSkipAllowed(resolveSkipPolicy(response?.data || {}));
    } catch {
      // Policy-safe default: skip is not allowed unless explicitly enabled by backend policy.
      setSkipAllowed(false);
    } finally {
      setCheckingSkipPolicy(false);
    }
  }

  function mapNextStepToRoute(rawStep) {
    const step = String(rawStep || "").toLowerCase();
    if (step === "go_live_checklist") return "GoLiveChecklist";
    if (step === "trial_start") return "TrialStart";
    if (step === "porting_form") return "PortingForm";
    if (step === "porting_documents") return "PortingDocuments";
    if (step === "porting_tracker") return "PortingStatus";
    if (step === "number_strategy") return "NumberStrategy";
    if (step === "business_snapshot") return "BusinessSnapshot";
    if (step === "account") return "Account";
    if (step === "welcome") return "Welcome";
    return "TrialStart";
  }

  function canNavigateTo(routeName) {
    const routeNames = navigation?.getState?.()?.routeNames || [];
    return routeNames.includes(routeName);
  }

  function normalizePhone(value) {
    return String(value || "").replace(/[^\d+]/g, "");
  }

  function isValidPhone(value) {
    const cleaned = normalizePhone(value);
    const digitsOnly = cleaned.replace(/\D/g, "");
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function generateIdempotencyKey() {
    const bytes = new Uint8Array(16);
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
      16,
      20
    )}-${hex.slice(20)}`;
  }

  function getBackendErrorMessage(errorResponse) {
    const data = errorResponse?.data;
    if (typeof data?.message === "string" && data.message.trim()) return data.message.trim();
    if (Array.isArray(data?.errors) && data.errors.length) {
      const first = data.errors[0];
      if (typeof first === "string") return first;
      if (typeof first?.message === "string") return first.message;
    }
    return "Failed to submit port request";
  }

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function skipPorting() {
    if (checkingSkipPolicy) return;

    if (!skipAllowed) {
      Alert.alert(
        "Porting remains required",
        "Your current policy requires number porting before full go-live. You can continue later, but this will remain a blocker in Go Live."
      );
      return;
    }

    setSkipLoading(true);
    setError("");
    try {
      const payload = {
        step: "porting",
        data: { skipped: true },
        completedAt: new Date().toISOString(),
        idempotencyKey: generateIdempotencyKey(),
      };
      const response = await api.post("/onboarding/step", payload);
      const nextStep = response?.data?.nextStep || response?.data?.currentStep || "trial_start";
      const mappedRoute = mapNextStepToRoute(nextStep);
      const nextRoute = canNavigateTo(mappedRoute) ? mappedRoute : "TrialStart";
      await setLocalStep(String(nextStep).toLowerCase());
      navigation.navigate(nextRoute);
    } catch (e) {
      setError(getBackendErrorMessage(e?.response));
    } finally {
      setSkipLoading(false);
    }
  }

  async function submitPorting() {
    setLoading(true);
    setError("");
    try {
      const requiredFields = [
        "phoneNumber",
        "carrier",
        "accountNumber",
        "pin",
        "billingZip",
        "contactName",
        "contactEmail",
      ];
      const missing = requiredFields.some((key) => !String(form[key] || "").trim());
      if (missing) {
        setError("All fields are required.");
        setLoading(false);
        return;
      }
      if (!isValidPhone(form.phoneNumber)) {
        setError("Enter a valid phone number.");
        setLoading(false);
        return;
      }
      if (!isValidEmail(form.contactEmail)) {
        setError("Enter a valid email address.");
        setLoading(false);
        return;
      }

      await setLocalStep("porting_form");
      const payload = {
        phoneNumber: normalizePhone(form.phoneNumber),
        carrier: form.carrier.trim(),
        accountNumber: form.accountNumber.trim(),
        pin: form.pin.trim(),
        billingZip: form.billingZip.trim(),
        contactName: form.contactName.trim(),
        contactEmail: form.contactEmail.trim().toLowerCase(),
        idempotencyKey: generateIdempotencyKey(),
      };
      const response = await api.post("/phone/porting/start", payload);
      const portingId =
        response?.data?.portingId ||
        response?.data?.id ||
        response?.data?._id ||
        null;
      navigation.navigate("PortingStatus", {
        portingId,
        seededStatusPayload: response?.data || null,
        resubmittedAt: Date.now(),
      });
    } catch (e) {
      setError(getBackendErrorMessage(e?.response));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={24}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.container}
        >
          <OnboardingHeader />
          <AppText variant="title" style={styles.title}>Port Your Number</AppText>
          <AppText variant="body" style={styles.subtitle}>Usually 3-10 business days depending on your carrier.</AppText>
          <AppBadge label="Number Porting" style={styles.badge} />

        {[
          ["phoneNumber", "Phone Number"],
          ["carrier", "Carrier"],
          ["accountNumber", "Account Number"],
          ["pin", "PIN / Passcode"],
          ["billingZip", "Billing ZIP"],
          ["contactName", "Contact Name"],
          ["contactEmail", "Contact Email"],
        ].map(([key, label]) => (
          <AppCard key={key} style={styles.fieldCard}>
            <AppText style={styles.label}>{label}</AppText>
            <TextInput
              value={form[key]}
              onChangeText={(value) => setField(key, value)}
              autoCapitalize={key === "contactName" || key === "carrier" ? "words" : "none"}
              keyboardType={
                key === "contactEmail"
                  ? "email-address"
                  : key === "phoneNumber"
                    ? "phone-pad"
                    : key === "billingZip" || key === "pin"
                      ? "number-pad"
                      : "default"
              }
              textContentType={key === "contactEmail" ? "emailAddress" : "none"}
              style={styles.input}
            />
          </AppCard>
        ))}

          {!!error ? <AppText style={styles.error}>{error}</AppText> : null}

          <Pressable style={[styles.primaryBtn, loading && styles.disabled]} disabled={loading || skipLoading} onPress={submitPorting}>
            <AppText style={styles.primaryText}>{loading ? "Submitting..." : "Submit Port Request"}</AppText>
          </Pressable>

          <Pressable style={styles.secondaryBtn} onPress={skipPorting} disabled={loading || skipLoading || checkingSkipPolicy}>
            <AppText style={styles.secondaryText}>
              {checkingSkipPolicy ? "Checking policy..." : skipLoading ? "Skipping..." : "I'll do this later"}
            </AppText>
          </Pressable>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { paddingHorizontal: spacing.xl, paddingBottom: 140, paddingTop: spacing.sm },
  title: { marginBottom: spacing.xs },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.xs },
  badge: { marginBottom: spacing.md },
  fieldCard: { marginBottom: spacing.sm, padding: spacing.md },
  label: { fontWeight: "700", marginBottom: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.textPrimary },
  primaryBtn: {
    backgroundColor: "#000",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: spacing.md,
  },
  disabled: { opacity: 0.7 },
  primaryText: { color: "#fff", fontWeight: "900" },
  secondaryBtn: { marginTop: spacing.sm, alignItems: "center", paddingVertical: spacing.sm },
  secondaryText: { color: colors.textPrimary, textDecorationLine: "underline", fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "700", marginTop: spacing.sm },
});
