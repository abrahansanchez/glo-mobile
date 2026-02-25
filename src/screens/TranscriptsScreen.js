import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import api from "../config/api";

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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading transcripts...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
        <Text>{error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        data={transcripts}
        keyExtractor={(item, index) => String(getTranscriptId(item) || index)}
        ListEmptyComponent={<Text>No transcripts yet.</Text>}
        renderItem={({ item }) => {
          const transcriptId = getTranscriptId(item);
          return (
            <Pressable
              onPress={() => {
                if (!transcriptId) return;
                navigation.navigate("TranscriptDetail", { transcriptId });
              }}
              style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#ddd" }}
            >
              <Text>Caller: {item?.callerNumber || item?.from || "Unknown"}</Text>
              <Text>When: {formatDate(item?.callEndedAt || item?.createdAt)}</Text>
              <Text>Intent/Outcome: {item?.intent || "-"} / {item?.outcome || "-"}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
