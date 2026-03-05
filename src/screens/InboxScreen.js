import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ScreenContainer from "../components/layout/ScreenContainer";

export default function InboxScreen() {
  const navigation = useNavigation();

  function canNavigateTo(routeName) {
    const routeNames = navigation?.getState?.()?.routeNames || [];
    const parentRouteNames = navigation?.getParent?.()?.getState?.()?.routeNames || [];
    return routeNames.includes(routeName) || parentRouteNames.includes(routeName);
  }

  function go(routeName) {
    if (!canNavigateTo(routeName)) return;
    navigation.navigate(routeName);
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.title}>Inbox</Text>
        <Text style={styles.body}>Calls, voicemail, and transcripts in one place.</Text>

        <Pressable
          style={styles.card}
          onPress={() => go("Calls")}
          disabled={!canNavigateTo("Calls")}
        >
          <Text style={styles.cardTitle}>Calls</Text>
          <Text style={styles.cardText}>Open call tools and test flow.</Text>
        </Pressable>

        <Pressable
          style={styles.card}
          onPress={() => go("Voicemails")}
          disabled={!canNavigateTo("Voicemails")}
        >
          <Text style={styles.cardTitle}>Voicemail</Text>
          <Text style={styles.cardText}>Review recent voicemail messages.</Text>
        </Pressable>

        <Pressable
          style={styles.card}
          onPress={() => go("Transcripts")}
          disabled={!canNavigateTo("Transcripts")}
        >
          <Text style={styles.cardTitle}>Transcripts</Text>
          <Text style={styles.cardText}>Read conversation transcripts.</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: "900", marginBottom: 8 },
  body: { color: "#4b5563", fontSize: 15, marginBottom: 12 },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 4 },
  cardText: { color: "#4b5563" },
});
