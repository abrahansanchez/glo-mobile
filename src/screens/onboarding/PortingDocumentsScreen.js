import React, { useEffect, useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import api from "../../config/api";
import OnboardingHeader from "../../onboarding/OnboardingHeader";
import AppCard from "../../components/ui/AppCard";
import AppText from "../../components/ui/AppText";
import AppBadge from "../../components/ui/AppBadge";
import AppButton from "../../components/ui/AppButton";
import OnboardingHero from "../../components/onboarding/OnboardingHero";
import { colors, spacing } from "../../ui/tokens";

function getPortingId(payload) {
  return payload?.portingId || payload?.id || payload?._id || null;
}

function isUploaded(value) {
  return Boolean(value);
}

function formatMimeType(file) {
  if (!file) return "";
  const type = file.mimeType || file.type || "";
  if (!type) return "unknown";
  if (type.includes("/")) {
    const [, subtype] = type.split("/");
    return subtype || type;
  }
  return type;
}

function getBackendErrorMessage(errorResponse) {
  const data = errorResponse?.data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message.trim();
  if (Array.isArray(data?.errors) && data.errors.length) {
    const first = data.errors[0];
    if (typeof first === "string") return first;
    if (typeof first?.message === "string") return first.message;
  }
  return "Failed to upload documents.";
}

export default function PortingDocumentsScreen({ navigation, route }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [portingId, setPortingId] = useState(route?.params?.portingId || null);
  const [loaFile, setLoaFile] = useState(null);
  const [billFile, setBillFile] = useState(null);
  const [loaUploaded, setLoaUploaded] = useState(false);
  const [billUploaded, setBillUploaded] = useState(false);
  const [loaUploadSuccess, setLoaUploadSuccess] = useState(false);
  const [billUploadSuccess, setBillUploadSuccess] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const response = await api.get("/phone/porting/status");
      const payload = response?.data || {};
      const pid = getPortingId(payload);
      if (pid) setPortingId(pid);

      const docs = payload?.documents || {};
      setLoaUploaded(isUploaded(docs?.loa || payload?.loaUploaded || payload?.loaUrl));
      setBillUploaded(isUploaded(docs?.bill || payload?.billUploaded || payload?.billUrl));
    } catch (e) {
      // best effort, keep screen usable
    }
  }

  async function pickDoc(kind) {
    try {
      const DocumentPicker = require("expo-document-picker");
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result?.canceled) return;
      const asset = result?.assets?.[0];
      if (!asset?.uri) return;

      if (kind === "loa") {
        setLoaFile(asset);
        setLoaUploadSuccess(false);
      } else {
        setBillFile(asset);
        setBillUploadSuccess(false);
      }
    } catch (e) {
      Alert.alert(
        "Upload unavailable",
        "Install expo-document-picker to enable file upload on this build."
      );
    }
  }

  async function uploadDocs() {
    if (!portingId) {
      setError("Porting request ID not found. Submit porting form first.");
      return;
    }
    if (!loaFile && !billFile) {
      setError("Please select at least one document.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      if (loaFile) {
        formData.append("loa", {
          uri: loaFile.uri,
          name: loaFile.name || "loa.pdf",
          type: loaFile.mimeType || "application/pdf",
        });
      }
      if (billFile) {
        formData.append("bill", {
          uri: billFile.uri,
          name: billFile.name || "bill.pdf",
          type: billFile.mimeType || "application/pdf",
        });
      }

      await api.post(`/phone/porting/${portingId}/docs`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (loaFile) {
        setLoaUploaded(true);
        setLoaUploadSuccess(true);
      }
      if (billFile) {
        setBillUploaded(true);
        setBillUploadSuccess(true);
      }

      setLoaFile(null);
      setBillFile(null);
      await loadStatus();
      navigation.navigate("PortingStatus", { portingId, refreshedAt: Date.now() });
    } catch (e) {
      setError(getBackendErrorMessage(e?.response));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <OnboardingHeader />
      <OnboardingHero
        stepLabel="Step 6 of 9"
        title="Upload Porting Documents"
        subtitle="Upload a signed LOA and a recent bill."
      />

      <View style={styles.badgeRow}>
        <AppBadge label={`LOA: ${loaUploaded ? "UPLOADED" : "MISSING"}`} tone={loaUploaded ? "success" : "warning"} />
        <AppBadge label={`BILL: ${billUploaded ? "UPLOADED" : "MISSING"}`} tone={billUploaded ? "success" : "warning"} />
      </View>

      <AppCard style={styles.statusRow}>
        <AppText style={styles.statusLabel}>LOA</AppText>
        <AppText style={[styles.statusValue, loaUploaded ? styles.ok : styles.missing]}>
          {loaUploaded ? "Uploaded" : "Missing"}
        </AppText>
      </AppCard>
      <AppCard style={styles.statusRow}>
        <AppText style={styles.statusLabel}>Recent bill</AppText>
        <AppText style={[styles.statusValue, billUploaded ? styles.ok : styles.missing]}>
          {billUploaded ? "Uploaded" : "Missing"}
        </AppText>
      </AppCard>

      <AppButton
        variant="secondary"
        style={styles.secondaryBtn}
        label={
          loaFile
            ? `Selected LOA: ${loaFile.name || "file"} (${formatMimeType(loaFile)})`
            : "Select LOA file"
        }
        onPress={() => pickDoc("loa")}
      />
      {loaUploadSuccess ? <AppText style={styles.success}>LOA uploaded successfully.</AppText> : null}
      <AppButton
        variant="secondary"
        style={styles.secondaryBtn}
        label={
          billFile
            ? `Selected bill: ${billFile.name || "file"} (${formatMimeType(billFile)})`
            : "Select bill file"
        }
        onPress={() => pickDoc("bill")}
      />
      {billUploadSuccess ? <AppText style={styles.success}>Bill uploaded successfully.</AppText> : null}

      {!!error ? <AppText style={styles.error}>{error}</AppText> : null}

      <AppButton
        variant="primary"
        style={styles.primaryBtn}
        label={loading ? "Uploading bill + LOA..." : "Upload documents"}
        onPress={uploadDocs}
        disabled={loading}
      />

      <AppButton
        variant="secondary"
        style={styles.secondaryBtn}
        label="View status"
        onPress={() => navigation.navigate("PortingStatus")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24, justifyContent: "center" },
  badgeRow: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.sm },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  statusLabel: { fontWeight: "700", color: colors.textPrimary },
  statusValue: { fontWeight: "800" },
  ok: { color: colors.success },
  missing: { color: colors.warning },
  primaryBtn: { marginTop: spacing.sm },
  secondaryBtn: { marginTop: spacing.sm },
  error: { color: colors.danger, fontWeight: "700", marginTop: spacing.sm },
  success: { color: colors.success, fontWeight: "700", marginTop: spacing.xs },
});
