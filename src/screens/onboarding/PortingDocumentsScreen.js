import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import api from "../../config/api";
import OnboardingHeader from "../../onboarding/OnboardingHeader";

function getPortingId(payload) {
  return payload?.portingId || payload?.id || payload?._id || null;
}

function isUploaded(value) {
  return Boolean(value);
}

export default function PortingDocumentsScreen({ navigation, route }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [portingId, setPortingId] = useState(route?.params?.portingId || null);
  const [loaFile, setLoaFile] = useState(null);
  const [billFile, setBillFile] = useState(null);
  const [loaUploaded, setLoaUploaded] = useState(false);
  const [billUploaded, setBillUploaded] = useState(false);

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
      } else {
        setBillFile(asset);
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
      await loadStatus();
      Alert.alert("Success", "Documents uploaded successfully.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to upload documents.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <OnboardingHeader />
      <Text style={styles.title}>Upload Porting Documents</Text>
      <Text style={styles.subtitle}>Upload signed LOA and a recent bill.</Text>

      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>LOA</Text>
        <Text style={[styles.statusValue, loaUploaded ? styles.ok : styles.missing]}>
          {loaUploaded ? "Uploaded" : "Missing"}
        </Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Recent bill</Text>
        <Text style={[styles.statusValue, billUploaded ? styles.ok : styles.missing]}>
          {billUploaded ? "Uploaded" : "Missing"}
        </Text>
      </View>

      <Pressable style={styles.secondaryBtn} onPress={() => pickDoc("loa")}>
        <Text style={styles.secondaryText}>
          {loaFile ? `Selected LOA: ${loaFile.name || "file"}` : "Select LOA file"}
        </Text>
      </Pressable>
      <Pressable style={styles.secondaryBtn} onPress={() => pickDoc("bill")}>
        <Text style={styles.secondaryText}>
          {billFile ? `Selected bill: ${billFile.name || "file"}` : "Select bill file"}
        </Text>
      </Pressable>

      {!!error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.primaryBtn, loading && styles.disabled]}
        onPress={uploadDocs}
        disabled={loading}
      >
        <Text style={styles.primaryText}>{loading ? "Uploading..." : "Upload documents"}</Text>
      </Pressable>

      <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("PortingStatus")}>
        <Text style={styles.secondaryText}>View status</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24, justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "900", marginBottom: 8 },
  subtitle: { color: "#4b5563", marginBottom: 14 },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  statusLabel: { fontWeight: "700", color: "#111827" },
  statusValue: { fontWeight: "800" },
  ok: { color: "#065f46" },
  missing: { color: "#b45309" },
  primaryBtn: { backgroundColor: "#000", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 8 },
  primaryText: { color: "#fff", fontWeight: "900" },
  secondaryBtn: { alignItems: "center", marginTop: 10, padding: 10 },
  secondaryText: { textDecorationLine: "underline", fontWeight: "700", color: "#111827" },
  disabled: { opacity: 0.6 },
  error: { color: "#b00020", fontWeight: "700", marginTop: 8 },
});

