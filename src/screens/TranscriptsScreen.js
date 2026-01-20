import { View, Text, FlatList, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import api from "../config/api";
import LoadingState from "../components/LoadingState";

export default function TranscriptsScreen() {
  const [loading, setLoading] = useState(true);
  const [transcripts, setTranscripts] = useState([]);

  useEffect(() => {
    loadTranscripts();
  }, []);

  async function loadTranscripts() {
    try {
      setLoading(true);

      const res = await api.get("/dashboard/transcripts");

      // Backend returns { transcripts, page, total, ... }
      const list = Array.isArray(res.data?.transcripts)
        ? res.data.transcripts
        : [];

      setTranscripts(list);
    } catch (err) {
      console.log(
        "Transcripts load error:",
        err?.response?.data || err.message
      );
      setTranscripts([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading transcripts..." />;
  }

  if (!transcripts.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>No transcripts found</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={transcripts}
      keyExtractor={(item) => item._id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.intent}>
            Intent: {item.intent || "Unknown"}
          </Text>

          <Text style={styles.meta}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>

          {item.outcome && (
            <Text style={styles.outcome}>
              Outcome: {item.outcome}
            </Text>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    fontSize: 16,
    color: "#777",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  intent: {
    fontSize: 15,
    fontWeight: "600",
  },
  meta: {
    marginTop: 6,
    fontSize: 13,
    color: "#666",
  },
  outcome: {
    marginTop: 6,
    fontSize: 13,
    color: "#555",
  },
});
