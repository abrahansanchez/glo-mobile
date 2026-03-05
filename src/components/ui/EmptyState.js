import React from "react";
import { View, StyleSheet } from "react-native";
import AppText from "./AppText";
import { spacing } from "../../ui/tokens";

export default function EmptyState({ title = "Nothing here yet", message = "Coming soon" }) {
  return (
    <View style={styles.wrap}>
      <AppText variant="section" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="body">{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginBottom: spacing.xs,
  },
});
