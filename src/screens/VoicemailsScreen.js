import { View, FlatList, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import api from "../config/api";
import LoadingState from "../components/LoadingState";
import ScreenContainer from "../components/layout/ScreenContainer";
import AppCard from "../components/ui/AppCard";
import AppText from "../components/ui/AppText";
import EmptyState from "../components/ui/EmptyState";
import { spacing } from "../ui/tokens";

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
    return (
      <ScreenContainer>
        <LoadingState label="Loading voicemails..." />
      </ScreenContainer>
    );
  }

  if (!voicemails.length) {
    return (
      <ScreenContainer>
        <EmptyState title="No voicemails" message="New voicemail messages will appear here." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppText variant="title" style={styles.title}>Voicemail</AppText>
      <FlatList
        data={voicemails}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <AppCard style={styles.card}>
            <AppText style={styles.caller}>
              {item.from || "Unknown caller"}
            </AppText>

            <AppText variant="caption" style={styles.meta}>
              {new Date(item.createdAt).toLocaleString()}
            </AppText>

            <View style={styles.separator} />
            <AppText variant="body" style={styles.duration}>
              Duration: {item.duration || "—"} sec
            </AppText>
          </AppCard>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.md },
  list: { paddingBottom: spacing.md },
  card: {
    marginBottom: spacing.sm,
  },
  caller: {
    fontSize: 15,
    fontWeight: "700",
  },
  meta: {
    marginTop: 4,
  },
  separator: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.35)",
  },
  duration: {
    fontSize: 13,
  },
});
