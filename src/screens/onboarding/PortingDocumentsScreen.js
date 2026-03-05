import React, { useEffect, useState } from "react";
import { View, Pressable, StyleSheet, Alert } from "react-native";
import api from "../../config/api";
import OnboardingHeader from "../../onboarding/OnboardingHeader";
import AppCard from "../../components/ui/AppCard";
import AppText from "../../components/ui/AppText";
import AppBadge from "../../components/ui/AppBadge";
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
      <AppText variant="title" style={styles.title}>Upload Porting Documents</AppText>
      <AppText variant="body" style={styles.subtitle}>Upload signed LOA and a recent bill.</AppText>

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

      <Pressable style={styles.secondaryBtn} onPress={() => pickDoc("loa")}>
        <AppText style={styles.secondaryText}>
          {loaFile
            ? `Selected LOA: ${loaFile.name || "file"} (${formatMimeType(loaFile)})`
            : "Select LOA file"}
        </AppText>
      </Pressable>
      {loaUploadSuccess ? <AppText style={styles.success}>LOA uploaded successfully.</AppText> : null}
      <Pressable style={styles.secondaryBtn} onPress={() => pickDoc("bill")}>
        <AppText style={styles.secondaryText}>
          {billFile
            ? `Selected bill: ${billFile.name || "file"} (${formatMimeType(billFile)})`
            : "Select bill file"}
        </AppText>
      </Pressable>
      {billUploadSuccess ? <AppText style={styles.success}>Bill uploaded successfully.</AppText> : null}

      {!!error ? <AppText style={styles.error}>{error}</AppText> : null}

      <Pressable
        style={[styles.primaryBtn, loading && styles.disabled]}
        onPress={uploadDocs}
        disabled={loading}
      >
        <AppText style={styles.primaryText}>{loading ? "Uploading bill + LOA..." : "Upload documents"}</AppText>
      </Pressable>

      <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("PortingStatus")}>
        <AppText style={styles.secondaryText}>View status</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24, justifyContent: "center" },
  title: { marginBottom: spacing.xs },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.md },
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
  primaryBtn: { backgroundColor: "#000", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: spacing.sm },
  primaryText: { color: "#fff", fontWeight: "900" },
  secondaryBtn: { alignItems: "center", marginTop: spacing.sm, padding: spacing.sm },
  secondaryText: { textDecorationLine: "underline", fontWeight: "700", color: colors.textPrimary },
  disabled: { opacity: 0.6 },
  error: { color: colors.danger, fontWeight: "700", marginTop: spacing.sm },
  success: { color: colors.success, fontWeight: "700", marginTop: spacing.xs },
});
