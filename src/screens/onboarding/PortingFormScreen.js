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
    businessName: "",
    authorizedName: "",
    serviceStreet: "",
    serviceCity: "",
    serviceState: "",
    serviceZip: "",
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
      businessName: source.businessName || source.companyName || "",
      authorizedName: source.authorizedName || source.contactName || "",
      serviceStreet: source.serviceStreet || source.address1 || source.street || "",
      serviceCity: source.serviceCity || source.city || "",
      serviceState: source.serviceState || source.state || "",
      serviceZip: source.serviceZip || source.zip || "",
      carrier: source.carrier || "",
      accountNumber: source.accountNumber || "",
      pin: source.pin || source.passcode || "",
      billingZip: source.billingZip || source.zip || "",
      contactName: source.contactName || source.authorizedName || "",
      contactEmail: source.contactEmail || source.email || "",
    };
  }

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submitPorting() {
    setLoading(true);
    setError("");
    try {
      if (!form.phoneNumber || !form.businessName || !form.authorizedName) {
        setError("Phone number, business name, and authorized name are required.");
        setLoading(false);
        return;
      }
      if (!form.serviceStreet || !form.serviceCity || !form.serviceState || !form.serviceZip) {
        setError("Complete service address is required.");
        setLoading(false);
        return;
      }
      if (!form.carrier || !form.accountNumber) {
        setError("Carrier name and account number are required.");
        setLoading(false);
        return;
      }

      await setLocalStep("porting_form");
      const payload = {
        ...form,
        contactName: form.authorizedName || form.contactName,
        billingZip: form.serviceZip || form.billingZip,
        serviceAddress: {
          street: form.serviceStreet,
          city: form.serviceCity,
          state: form.serviceState,
          zip: form.serviceZip,
        },
        idempotencyKey: `porting-${Date.now()}`,
      };
      const response = await api.post("/phone/porting/start", payload);
      const portingId =
        response?.data?.portingId ||
        response?.data?.id ||
        response?.data?._id ||
        null;
      navigation.navigate("PortingStatus", { portingId });
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to submit port request");
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
          ["businessName", "Business Name"],
          ["authorizedName", "Authorized Name"],
          ["serviceStreet", "Service Street"],
          ["serviceCity", "Service City"],
          ["serviceState", "Service State"],
          ["serviceZip", "Service ZIP"],
          ["carrier", "Carrier"],
          ["accountNumber", "Account Number"],
          ["pin", "PIN / Passcode"],
          ["contactEmail", "Authorized Contact Email (optional)"],
        ].map(([key, label]) => (
          <View key={key}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              value={form[key]}
              onChangeText={(value) => setField(key, value)}
              autoCapitalize="none"
              keyboardType={key === "contactEmail" ? "email-address" : "default"}
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
