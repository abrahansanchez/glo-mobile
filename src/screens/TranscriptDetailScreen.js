import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../config/api";
import { normalizeTranscriptTimeline } from "../utils/transcriptTimeline";

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
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text>Loading transcript...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
          <Text>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 16, gap: 8 }}>
        <Text>Caller: {detail?.callerNumber || detail?.from || "Unknown"}</Text>
        <Text>Intent: {detail?.intent || "-"}</Text>
        <Text>Outcome: {detail?.outcome || "-"}</Text>

        <Text style={{ marginTop: 10, fontWeight: "700" }}>Transcript</Text>
        {normalizedTranscript.timeline.length === 0 ? (
          <Text>No transcript lines.</Text>
        ) : (
          normalizedTranscript.timeline.map((line) => (
            <Text key={line.id} style={{ marginBottom: 6 }}>
              {`${line.role}: ${line.text}`}
            </Text>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
