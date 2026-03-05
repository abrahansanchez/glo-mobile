import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import api from "../../config/api";
import OnboardingHeader from "../../onboarding/OnboardingHeader";

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
  const [error, setError] = useState("");

  useEffect(() => {
    hydratePrefill();
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
          <Text style={styles.title}>Port Your Number</Text>
          <Text style={styles.subtitle}>Usually 3-10 business days depending on your carrier.</Text>

        {[
          ["phoneNumber", "Phone Number"],
          ["carrier", "Carrier"],
          ["accountNumber", "Account Number"],
          ["pin", "PIN / Passcode"],
          ["billingZip", "Billing ZIP"],
          ["contactName", "Contact Name"],
          ["contactEmail", "Contact Email"],
        ].map(([key, label]) => (
          <View key={key}>
            <Text style={styles.label}>{label}</Text>
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
          </View>
        ))}

          {!!error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={[styles.primaryBtn, loading && styles.disabled]} disabled={loading} onPress={submitPorting}>
            <Text style={styles.primaryText}>{loading ? "Submitting..." : "Submit Port Request"}</Text>
          </Pressable>

          <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("TrialStart")}>
            <Text style={styles.secondaryText}>I'll do this later</Text>
          </Pressable>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { paddingHorizontal: 20, paddingBottom: 140, paddingTop: 8 },
  title: { fontSize: 26, fontWeight: "900", marginBottom: 6 },
  subtitle: { color: "#4b5563", marginBottom: 14 },
  label: { fontWeight: "700", marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, padding: 12 },
  primaryBtn: {
    backgroundColor: "#000",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  disabled: { opacity: 0.7 },
  primaryText: { color: "#fff", fontWeight: "900" },
  secondaryBtn: { marginTop: 10, alignItems: "center", paddingVertical: 10 },
  secondaryText: { color: "#111827", textDecorationLine: "underline", fontWeight: "700" },
  error: { color: "#b00020", fontWeight: "700", marginTop: 8 },
});
