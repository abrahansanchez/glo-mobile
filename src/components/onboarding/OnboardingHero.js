import React from "react";
import { StyleSheet, View } from "react-native";
import AppText from "../ui/AppText";
import AppBadge from "../ui/AppBadge";
import { spacing } from "../../ui/tokens";

export default function OnboardingHero({ title, subtitle, stepLabel }) {
  return (
    <View style={styles.wrap}>
      {stepLabel ? <AppBadge label={stepLabel} style={styles.badge} /> : null}
      <AppText variant="title" style={styles.title}>{title}</AppText>
      {subtitle ? <AppText variant="body" style={styles.subtitle}>{subtitle}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  badge: { marginBottom: spacing.xs },
  title: { marginBottom: spacing.xs },
  subtitle: { lineHeight: 21 },
});
