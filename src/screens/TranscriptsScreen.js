import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import api from "../config/api";
import { normalizeTranscriptTimeline, transcriptPreview } from "../utils/transcriptTimeline";
import ScreenContainer from "../components/layout/ScreenContainer";
import AppCard from "../components/ui/AppCard";
import AppText from "../components/ui/AppText";
import EmptyState from "../components/ui/EmptyState";
import { spacing } from "../ui/tokens";

function getTranscriptId(item) {
  return item?._id || item?.id || null;
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default function TranscriptsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [transcripts, setTranscripts] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/dashboard/transcripts");
        const list = Array.isArray(response.data)
          ? response.data
          : response.data?.transcripts || [];
        list.forEach((item) => {
          const mode = normalizeTranscriptTimeline(item).mode;
          console.log(`[TRANSCRIPT_RENDER_MODE] ${mode}`);
          if (mode === "empty") {
            console.log("[TRANSCRIPT_EMPTY_SHAPE_KEYS]", Object.keys(item || {}).slice(0, 20));
          }
        });
        console.log(`[TRANSCRIPTS] loaded count=${list.length}`);
        setTranscripts(list);
      } catch (err) {
        console.log("[TRANSCRIPTS] load failed", err?.response?.data || err?.message || err);
        setError("Failed to load transcripts");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <AppText>Loading transcripts...</AppText>
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
      <AppText variant="title" style={styles.title}>Transcripts</AppText>
      <FlatList
        data={transcripts}
        keyExtractor={(item, index) => String(getTranscriptId(item) || index)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState title="No transcripts yet" message="Completed calls with transcripts will appear here." />
        }
        renderItem={({ item }) => {
          const transcriptId = getTranscriptId(item);
          const caller = item?.callerNumber || item?.from || "Unknown";
          const previewText = transcriptPreview(item);
          return (
            <Pressable
              onPress={() => {
                if (!transcriptId) return;
                navigation.navigate("TranscriptDetail", { transcriptId });
              }}
              style={styles.rowPressable}
            >
              <AppCard style={styles.rowCard}>
                <AppText style={styles.rowTitle}>Caller: {caller}</AppText>
                <AppText variant="caption" style={styles.rowMeta}>
                  {formatDate(item?.callEndedAt || item?.createdAt)}
                </AppText>
                <View style={styles.separator} />
                <AppText variant="body">
                  Intent/Outcome: {item?.intent || "-"} / {item?.outcome || "-"}
                </AppText>
                <AppText variant="caption" numberOfLines={2} style={styles.preview}>
                  Preview: {previewText}
                </AppText>
              </AppCard>
            </Pressable>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.md },
  list: { paddingBottom: spacing.md },
  rowPressable: { marginBottom: spacing.sm },
  rowCard: { padding: spacing.md },
  rowTitle: { fontWeight: "800" },
  rowMeta: { marginTop: spacing.xs },
  separator: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.35)",
  },
  preview: { marginTop: spacing.sm },
});
