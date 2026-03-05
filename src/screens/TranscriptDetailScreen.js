import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import api from "../config/api";
import { normalizeTranscriptTimeline } from "../utils/transcriptTimeline";
import ScreenContainer from "../components/layout/ScreenContainer";
import AppCard from "../components/ui/AppCard";
import AppText from "../components/ui/AppText";
import EmptyState from "../components/ui/EmptyState";
import { spacing } from "../ui/tokens";

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
        const data = response.data?.transcript || response.data;
        setDetail(data || null);
        console.log(`[TRANSCRIPT_DETAIL] loaded id=${transcriptId}`);
      } catch (err) {
        console.log("[TRANSCRIPT_DETAIL] load failed", err?.response?.data || err?.message || err);
        setError("Failed to load transcript");
      } finally {
        setLoading(false);
      }
    })();
  }, [transcriptId]);

  const normalizedTranscript = useMemo(() => normalizeTranscriptTimeline(detail), [detail]);

  useEffect(() => {
    if (!detail) return;
    console.log(`[TRANSCRIPT_RENDER_MODE] ${normalizedTranscript.mode}`);
  }, [detail, normalizedTranscript.mode]);

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

        <AppText variant="section" style={styles.sectionTitle}>Transcript</AppText>
        {normalizedTranscript.timeline.length === 0 ? (
          <EmptyState title="No transcript lines" message="No transcript content is available for this call yet." />
        ) : (
          normalizedTranscript.timeline.map((line) => (
            <AppCard key={line.id} style={styles.lineCard}>
              <AppText variant="caption" style={styles.roleLabel}>{line.role}</AppText>
              <AppText variant="body">{line.text}</AppText>
            </AppCard>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: spacing.xl },
  title: { marginBottom: spacing.md },
  metaCard: { marginBottom: spacing.md },
  metaLine: { fontWeight: "700" },
  separator: {
    marginVertical: spacing.sm,
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.35)",
  },
  sectionTitle: { marginBottom: spacing.sm },
  lineCard: { marginBottom: spacing.sm },
  roleLabel: { textTransform: "uppercase", marginBottom: spacing.xs, fontWeight: "700" },
});
