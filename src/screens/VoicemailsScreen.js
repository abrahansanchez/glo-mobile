import { View, Text, FlatList, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import api from "../config/api";
import LoadingState from "../components/LoadingState";

export default function VoicemailsScreen() {
  const [loading, setLoading] = useState(true);
  const [voicemails, setVoicemails] = useState([]);

  useEffect(() => {
    loadVoicemails();
  }, []);

  async function loadVoicemails() {
    try {
      setLoading(true);
      const res = await api.get("/voicemail");

      // Defensive: ensure array
      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.voicemails || [];

      setVoicemails(list);
    } catch (err) {
      console.log(
        "Voicemails load error:",
        err?.response?.data || err.message
      );
      setVoicemails([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading voicemails..." />;
  }

  if (!voicemails.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>No voicemails</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={voicemails}
      keyExtractor={(item) => item._id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.caller}>
            {item.from || "Unknown caller"}
          </Text>

          <Text style={styles.meta}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>

          <Text style={styles.duration}>
            Duration: {item.duration || "—"} sec
          </Text>
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
  caller: {
    fontSize: 15,
    fontWeight: "600",
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    color: "#666",
  },
  duration: {
    marginTop: 8,
    fontSize: 12,
    color: "#444",
  },
});
