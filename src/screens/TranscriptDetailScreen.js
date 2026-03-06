import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import api from "../config/api";
import ScreenContainer from "../components/layout/ScreenContainer";
import AppCard from "../components/ui/AppCard";
import AppText from "../components/ui/AppText";
import EmptyState from "../components/ui/EmptyState";
import { spacing } from "../ui/tokens";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toText(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (!value || typeof value !== "object") return "";
  const maybeText = value.text ?? value.content ?? value.message ?? value.body ?? value.utterance;
  return typeof maybeText === "string" ? maybeText.trim() : "";
}

function normalizeRole(rawRole, fallback = "system") {
  const role = String(rawRole || "").toLowerCase();
  if (["caller", "user", "customer", "human"].includes(role)) return "caller";
  if (["assistant", "ai", "bot"].includes(role)) return "assistant";
  if (role === "system") return "system";
  return fallback;
}

function normalizeLine(entry, index, fallbackRole = "system") {
  if (typeof entry === "string") {
    const text = entry.trim();
    return text ? { id: `line-${index}`, role: fallbackRole, text } : null;
  }

  if (!entry || typeof entry !== "object") return null;
  const text = toText(entry);
  if (!text) return null;
  return {
    id: String(entry.id || entry._id || `line-${index}`),
    role: normalizeRole(entry.role || entry.speaker, fallbackRole),
    text,
  };
}

function normalizeStringOrArrayToLines(value, fallbackRole = "system") {
  if (Array.isArray(value)) {
    return value
      .map((entry, index) => normalizeLine(entry, index, fallbackRole))
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => ({ id: `line-${index}`, role: fallbackRole, text: line }));
  }

  return [];
}

function buildCallerLines(transcript) {
  const fromTranscriptLines = normalizeStringOrArrayToLines(transcript?.transcriptLines, "caller");
  if (fromTranscriptLines.length > 0) return fromTranscriptLines;

  const messageCallerLines = toArray(transcript?.messages)
    .map((entry, index) => normalizeLine(entry, index, "system"))
    .filter((line) => line && line.role === "caller");
  if (messageCallerLines.length > 0) return messageCallerLines;

  const fromLegacyTranscript = normalizeStringOrArrayToLines(transcript?.transcript, "caller");
  if (fromLegacyTranscript.length > 0) return fromLegacyTranscript;

  const summary = toText(transcript?.summary);
  if (summary) return [{ id: "summary-0", role: "system", text: summary }];

  const preview = toText(transcript?.preview);
  if (preview) return [{ id: "preview-0", role: "system", text: preview }];

  return [];
}

function buildAssistantLines(transcript) {
  const fromAssistantLines = normalizeStringOrArrayToLines(transcript?.assistantLines, "assistant");
  if (fromAssistantLines.length > 0) return fromAssistantLines;

  const messageAssistantLines = toArray(transcript?.messages)
    .map((entry, index) => normalizeLine(entry, index, "system"))
    .filter((line) => line && line.role === "assistant");
  if (messageAssistantLines.length > 0) return messageAssistantLines;

  return normalizeStringOrArrayToLines(transcript?.aiResponses, "assistant");
}

function hasNormalizedTranscriptFields(value) {
  if (!value || typeof value !== "object") return false;
  return Boolean(
    value.preview != null ||
      value.summary != null ||
      value.status != null ||
      value.transcriptLines != null ||
      value.assistantLines != null ||
      value.messages != null ||
      value.transcript != null ||
      value.aiResponses != null
  );
}

function pickTranscriptPayload(responseData) {
  const candidates = [
    { source: "response.data.transcript", value: responseData?.transcript },
    { source: "response.data.data.transcript", value: responseData?.data?.transcript },
    { source: "response.data.payload.transcript", value: responseData?.payload?.transcript },
    { source: "response.data.data", value: responseData?.data },
    { source: "response.data", value: responseData },
  ];

  for (const candidate of candidates) {
    if (hasNormalizedTranscriptFields(candidate.value)) {
      return candidate;
    }
  }

  // Last-resort fallback, preserving existing behavior if backend returns a non-normalized shape.
  return candidates.find((candidate) => candidate.value != null) || { source: "none", value: null };
}

export default function TranscriptDetailScreen({ route }) {
  const transcriptId = route?.params?.transcriptId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    (async () => {
      if (!transcriptId) {
        setError("Missing transcript id");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const response = await api.get(`/dashboard/transcripts/${transcriptId}`);
        const picked = pickTranscriptPayload(response.data);
        setDetail(picked.value || null);
        console.log(`[TRANSCRIPT_DETAIL] loaded id=${transcriptId}`);
        if (__DEV__) {
          console.log("[TRANSCRIPT_DETAIL_RAW_RESPONSE]", response.data);
          console.log("[TRANSCRIPT_DETAIL_PICKED_SOURCE]", picked.source);
          console.log("[TRANSCRIPT_DETAIL_PICKED_KEYS]", Object.keys(picked.value || {}).slice(0, 30));
          console.log("[TRANSCRIPT_DETAIL_FIELDS]", {
            status: picked.value?.status ?? null,
            preview: toText(picked.value?.preview),
            summary: toText(picked.value?.summary),
            transcriptLines: Array.isArray(picked.value?.transcriptLines)
              ? picked.value.transcriptLines.length
              : typeof picked.value?.transcriptLines,
            assistantLines: Array.isArray(picked.value?.assistantLines)
              ? picked.value.assistantLines.length
              : typeof picked.value?.assistantLines,
            messages: Array.isArray(picked.value?.messages) ? picked.value.messages.length : typeof picked.value?.messages,
          });
        }
      } catch (err) {
        console.log("[TRANSCRIPT_DETAIL] load failed", err?.response?.data || err?.message || err);
        setError("Failed to load transcript");
      } finally {
        setLoading(false);
      }
    })();
  }, [transcriptId]);

  const transcriptStatus = String(detail?.status || "").toLowerCase();
  const callerLines = useMemo(() => buildCallerLines(detail), [detail]);
  const assistantLines = useMemo(() => buildAssistantLines(detail), [detail]);
  const summaryText = toText(detail?.summary);
  const previewText = toText(detail?.preview);
  const hasFallbackNarrative = Boolean(summaryText || previewText);

  useEffect(() => {
    if (!detail) return;
    if (__DEV__) {
      console.log("[TRANSCRIPT_DETAIL_STATUS]", transcriptStatus || "unknown");
      console.log("[TRANSCRIPT_DETAIL_COUNTS]", {
        callerLines: callerLines.length,
        assistantLines: assistantLines.length,
        hasSummary: Boolean(summaryText),
        hasPreview: Boolean(previewText),
      });
    }
  }, [detail, transcriptStatus, callerLines.length, assistantLines.length, summaryText, previewText]);

  if (loading) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <AppText>Loading transcript...</AppText>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
          <AppText>{error}</AppText>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <AppText variant="title" style={styles.title}>Transcript Detail</AppText>

        <AppCard style={styles.metaCard}>
          <AppText style={styles.metaLine}>Caller: {detail?.callerNumber || detail?.from || "Unknown"}</AppText>
          <View style={styles.separator} />
          <AppText variant="body">Intent: {detail?.intent || "-"}</AppText>
          <AppText variant="body">Outcome: {detail?.outcome || "-"}</AppText>
        </AppCard>

        {transcriptStatus === "processing" ? (
          <AppCard style={styles.statusCard}>
            <AppText style={styles.statusTitle}>Transcript is still processing</AppText>
            <AppText variant="body">Please check back shortly.</AppText>
          </AppCard>
        ) : null}

        {transcriptStatus === "failed" ? (
          <AppCard style={styles.statusCard}>
            <AppText style={styles.statusTitle}>Transcript failed</AppText>
            <AppText variant="body">
              {detail?.error || detail?.errorMessage || "The transcript could not be generated for this call."}
            </AppText>
          </AppCard>
        ) : null}

        {summaryText && callerLines.length === 0 ? (
          <AppCard style={styles.summaryCard}>
            <AppText variant="section" style={styles.summaryTitle}>Summary</AppText>
            <AppText variant="body">{summaryText}</AppText>
          </AppCard>
        ) : null}

        {!summaryText && previewText && callerLines.length === 0 ? (
          <AppCard style={styles.summaryCard}>
            <AppText variant="section" style={styles.summaryTitle}>Preview</AppText>
            <AppText variant="body">{previewText}</AppText>
          </AppCard>
        ) : null}

        <AppText variant="section" style={styles.sectionTitle}>Transcript</AppText>
        {callerLines.length === 0 ? (
          transcriptStatus === "processing" ? null : transcriptStatus === "failed" ? null : transcriptStatus === "empty" && !hasFallbackNarrative ? (
            <EmptyState title="No transcript lines" message="No transcript content is available for this call yet." />
          ) : !hasFallbackNarrative ? (
            <EmptyState title="No transcript lines" message="No transcript content is available for this call yet." />
          ) : null
        ) : (
          callerLines.map((line) => (
            <AppCard key={line.id} style={styles.lineCard}>
              <AppText variant="caption" style={styles.roleLabel}>{line.role}</AppText>
              <AppText variant="body">{line.text}</AppText>
            </AppCard>
          ))
        )}

        {assistantLines.length > 0 ? (
          <>
            <AppText variant="section" style={styles.sectionTitle}>Assistant</AppText>
            {assistantLines.map((line) => (
              <AppCard key={`assistant-${line.id}`} style={styles.lineCard}>
                <AppText variant="caption" style={styles.roleLabel}>{line.role}</AppText>
                <AppText variant="body">{line.text}</AppText>
              </AppCard>
            ))}
          </>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: spacing.xl },
  title: { marginBottom: spacing.md },
  metaCard: { marginBottom: spacing.md },
  metaLine: { fontWeight: "700" },
  statusCard: { marginBottom: spacing.md },
  statusTitle: { fontWeight: "800", marginBottom: spacing.xs },
  summaryCard: { marginBottom: spacing.md },
  summaryTitle: { marginBottom: spacing.xs },
  separator: {
    marginVertical: spacing.sm,
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.35)",
  },
  sectionTitle: { marginBottom: spacing.sm },
  lineCard: { marginBottom: spacing.sm },
  roleLabel: { textTransform: "uppercase", marginBottom: spacing.xs, fontWeight: "700" },
});
