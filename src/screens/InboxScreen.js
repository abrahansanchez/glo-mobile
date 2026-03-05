import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ScreenContainer from "../components/layout/ScreenContainer";
import AppCard from "../components/ui/AppCard";
import AppBadge from "../components/ui/AppBadge";
import AppText from "../components/ui/AppText";
import { spacing } from "../ui/tokens";

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
        <AppText variant="title" style={styles.title}>Inbox</AppText>
        <AppText variant="body" style={styles.body}>Calls, voicemail, and transcripts in one place.</AppText>

        <Pressable
          onPress={() => go("Calls")}
          disabled={!canNavigateTo("Calls")}
        >
          <AppCard style={styles.card}>
            <AppText variant="section" style={styles.cardTitle}>Calls</AppText>
            <AppText variant="body" style={styles.cardText}>Open call tools and test flow.</AppText>
            <AppBadge label="Entry point" style={styles.badge} />
          </AppCard>
        </Pressable>

        <Pressable
          onPress={() => go("Voicemails")}
          disabled={!canNavigateTo("Voicemails")}
        >
          <AppCard style={styles.card}>
            <AppText variant="section" style={styles.cardTitle}>Voicemail</AppText>
            <AppText variant="body" style={styles.cardText}>Review recent voicemail messages.</AppText>
            <AppBadge label="Entry point" style={styles.badge} />
          </AppCard>
        </Pressable>

        <Pressable
          onPress={() => go("Transcripts")}
          disabled={!canNavigateTo("Transcripts")}
        >
          <AppCard style={styles.card}>
            <AppText variant="section" style={styles.cardTitle}>Transcripts</AppText>
            <AppText variant="body" style={styles.cardText}>Read conversation transcripts.</AppText>
            <AppBadge label="Entry point" style={styles.badge} />
          </AppCard>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { marginBottom: spacing.xs },
  body: { marginBottom: spacing.md },
  card: { marginBottom: spacing.sm },
  cardTitle: { marginBottom: spacing.xs },
  cardText: { marginBottom: spacing.sm },
  badge: { marginTop: spacing.xs },
});
