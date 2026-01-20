import { View, Text, FlatList, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import api from "../config/api";
import LoadingState from "../components/LoadingState";

export default function CallsScreen() {
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState([]);

  useEffect(() => {
    loadCalls();
  }, []);

  async function loadCalls() {
    try {
      setLoading(true);
      const res = await api.get("/dashboard/transcripts");
      setCalls(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.log("Calls load error:", err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading calls..." />;
  }

  if (!calls.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>No recent calls</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={calls}
      keyExtractor={(item) => item._id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.phone}>
            {item.from || "Unknown caller"}
          </Text>

          <Text style={styles.meta}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>

          <View style={styles.row}>
            <Text style={styles.badge}>
              {item.handledBy === "ai" ? "AI" : "Human"}
            </Text>

            {item.outcome && (
              <Text style={styles.outcome}>{item.outcome}</Text>
            )}
          </View>
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
  phone: {
    fontSize: 15,
    fontWeight: "600",
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    color: "#666",
  },
  row: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  badge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0A84FF",
  },
  outcome: {
    fontSize: 12,
    color: "#555",
  },
});
