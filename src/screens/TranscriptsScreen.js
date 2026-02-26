import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import api from "../config/api";
import { normalizeTranscriptTimeline } from "../utils/transcriptTimeline";
import ScreenContainer from "../components/layout/ScreenContainer";

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
          <Text>Loading transcripts...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
          <Text>{error}</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <FlatList
        data={transcripts}
        keyExtractor={(item, index) => String(getTranscriptId(item) || index)}
        contentContainerStyle={{ paddingBottom: 16 }}
        ListEmptyComponent={
          <View style={{ paddingTop: 16 }}>
            <Text>No transcripts yet.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const transcriptId = getTranscriptId(item);
          const caller = item?.callerNumber || item?.from || "Unknown";
          const normalized = normalizeTranscriptTimeline(item);
          const previewEntry = normalized.timeline[0];
          const previewText = previewEntry
            ? `${previewEntry.role || "system"}: ${previewEntry.text || ""}`
            : "No transcript preview";
          return (
            <Pressable
              onPress={() => {
                if (!transcriptId) return;
                navigation.navigate("TranscriptDetail", { transcriptId });
              }}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#ddd",
              }}
            >
              <Text>Caller: {caller}</Text>
              <Text>When: {formatDate(item?.callEndedAt || item?.createdAt)}</Text>
              <Text>Intent/Outcome: {item?.intent || "-"} / {item?.outcome || "-"}</Text>
              <Text numberOfLines={1}>Preview: {previewText}</Text>
            </Pressable>
          );
        }}
      />
    </ScreenContainer>
  );
}
