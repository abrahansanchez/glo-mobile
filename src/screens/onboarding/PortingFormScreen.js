import React, { useContext, useEffect, useState } from "react";
import {
  View,
  TextInput,
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
import AppButton from "../../components/ui/AppButton";
import OnboardingHero from "../../components/onboarding/OnboardingHero";
import { routeForOnboardingStep } from "../../onboarding/routeForStep";
import { spacing } from "../../ui/tokens";
import { track } from "../../analytics/track";
import { useTheme } from "../../theme/ThemeContext";

export default function PortingFormScreen({ navigation, route }) {
  const { setLocalStep } = useContext(OnboardingContext);
  const { colors } = useTheme();
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
    track("porting_started", { step: "porting_form" });
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

  function canNavigateTo(routeName) {
    const routeNames = navigation?.getState?.()?.routeNames || [];
    return routeNames.includes(routeName);
  }

  function normalizePhone(value) {
    return String(value || "").replace(/[^\d]/g, "");
  }

  function normalizePhoneE164(value) {
    const digits = normalizePhone(value);
    if (!digits) return "";
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
    return `+${digits}`;
  }

  function normalizeZip(value) {
    const digits = String(value || "").replace(/[^\d]/g, "");
    return digits.slice(0, 5);
  }

  function buildPrimaryPayload(idempotencyKey) {
    return {
      phoneNumber: normalizePhoneE164(form.phoneNumber),
      carrier: form.carrier.trim(),
      accountNumber: form.accountNumber.replace(/\s+/g, "").trim(),
      pin: form.pin.replace(/\s+/g, "").trim(),
      billingZip: normalizeZip(form.billingZip),
      contactName: form.contactName.trim(),
      contactEmail: form.contactEmail.trim().toLowerCase(),
      idempotencyKey,
    };
  }

  function buildFallbackPayload(idempotencyKey) {
    return {
      // Some backends validate strict digits-only phone and/or legacy aliases.
      phoneNumber: normalizePhone(form.phoneNumber),
      phone: normalizePhone(form.phoneNumber),
      carrier: form.carrier.trim(),
      accountNumber: form.accountNumber.replace(/\s+/g, "").trim(),
      pin: form.pin.replace(/\s+/g, "").trim(),
      passcode: form.pin.replace(/\s+/g, "").trim(),
      billingZip: normalizeZip(form.billingZip) || String(form.billingZip || "").trim(),
      zip: normalizeZip(form.billingZip) || String(form.billingZip || "").trim(),
      contactName: form.contactName.trim(),
      name: form.contactName.trim(),
      contactEmail: form.contactEmail.trim().toLowerCase(),
      email: form.contactEmail.trim().toLowerCase(),
      idempotencyKey,
    };
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
    if (typeof data?.error === "string" && data.error.trim()) return data.error.trim();
    if (Array.isArray(data?.errors) && data.errors.length) {
      const first = data.errors[0];
      if (typeof first === "string") return first;
      if (typeof first?.message === "string") return first.message;
    }
    if (data?.details && typeof data.details === "object") {
      const detail = Object.entries(data.details)
        .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : String(val)}`)
        .join(" | ");
      if (detail) return detail;
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
      track("onboarding_step_skipped", { step: "porting" });
      const mappedRoute = routeForOnboardingStep(nextStep);
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
        track("porting_failed_validation", {
          step: "porting_form",
          reason: "missing_required_fields",
        });
        setError("All fields are required.");
        setLoading(false);
        return;
      }
      if (!isValidPhone(form.phoneNumber)) {
        track("porting_failed_validation", {
          step: "porting_form",
          reason: "invalid_phone",
        });
        setError("Enter a valid phone number.");
        setLoading(false);
        return;
      }
      if (!isValidEmail(form.contactEmail)) {
        track("porting_failed_validation", {
          step: "porting_form",
          reason: "invalid_email",
        });
        setError("Enter a valid email address.");
        setLoading(false);
        return;
      }

      await setLocalStep("porting_form");
      const idempotencyKey = generateIdempotencyKey();
      const payload = buildPrimaryPayload(idempotencyKey);
      if (__DEV__) {
        console.log("[PORTING_SUBMIT] payload", {
          ...payload,
          accountNumber: payload.accountNumber ? "***" : "",
          pin: payload.pin ? "***" : "",
        });
      }
      let response;
      try {
        response = await api.post("/phone/porting/start", payload, {
          headers: { "Idempotency-Key": idempotencyKey },
        });
      } catch (primaryError) {
        const code =
          primaryError?.response?.data?.code ||
          primaryError?.response?.data?.error;
        if (code !== "PORTING_VALIDATION_FAILED") {
          throw primaryError;
        }

        const fallbackPayload = buildFallbackPayload(idempotencyKey);
        if (__DEV__) {
          console.log("[PORTING_SUBMIT] retrying fallback payload shape");
        }
        response = await api.post("/phone/porting/start", fallbackPayload, {
          headers: { "Idempotency-Key": idempotencyKey },
        });
      }
      const portingId =
        response?.data?.portingId ||
        response?.data?.id ||
        response?.data?._id ||
        null;
      track("porting_submitted", {
        step: "porting_form",
        portingId,
      });
      navigation.navigate("PortingStatus", {
        portingId,
        seededStatusPayload: response?.data || null,
        resubmittedAt: Date.now(),
      });
    } catch (e) {
      track("porting_failed_validation", {
        step: "porting_form",
        reason: "backend_validation",
        error: e?.response?.data?.message || e?.message || "unknown",
      });
      setError(getBackendErrorMessage(e?.response));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.safe, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={24}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.container}
        >
          <OnboardingHeader />
          <OnboardingHero
            stepLabel="Step 5 of 9"
            title="Port Your Number"
            subtitle="Usually 3-10 business days depending on your carrier."
          />
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
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
            />
          </AppCard>
        ))}

          {!!error ? <AppText style={[styles.error, { color: colors.danger }]}>{error}</AppText> : null}

          <AppButton
            label={loading ? "Submitting..." : "Submit Port Request"}
            onPress={submitPorting}
            disabled={loading || skipLoading}
            variant="primary"
            style={styles.primaryBtn}
          />

          <AppButton
            label={checkingSkipPolicy ? "Checking policy..." : skipLoading ? "Skipping..." : "I'll do this later"}
            onPress={skipPorting}
            disabled={loading || skipLoading || checkingSkipPolicy}
            variant="secondary"
            style={styles.secondaryBtn}
          />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingHorizontal: spacing.xl, paddingBottom: 140, paddingTop: spacing.sm },
  badge: { marginBottom: spacing.md },
  fieldCard: { marginBottom: spacing.sm, padding: spacing.md },
  label: { fontWeight: "700", marginBottom: spacing.xs },
  input: { borderWidth: 1, borderRadius: 10, padding: 12 },
  primaryBtn: { marginTop: spacing.md },
  secondaryBtn: { marginTop: spacing.sm },
  error: { fontWeight: "700", marginTop: spacing.sm },
});
