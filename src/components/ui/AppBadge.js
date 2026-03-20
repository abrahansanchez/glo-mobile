import React from "react";
import { View, StyleSheet } from "react-native";
import AppText from "./AppText";
import { radii, spacing } from "../../ui/tokens";
import { useTheme } from "../../theme/ThemeContext";

export default function AppBadge({ label, tone = "neutral", style }) {
  const { colors, resolvedTheme } = useTheme();
  const toneStyles = {
    neutral: { bg: resolvedTheme === "dark" ? "#1f2937" : "#f3f4f6", text: colors.textSecondary },
    success: { bg: resolvedTheme === "dark" ? "#12382c" : "#ecfdf5", text: colors.success },
    warning: { bg: resolvedTheme === "dark" ? "#3a2a14" : "#fffbeb", text: colors.warning },
  };
  const toneStyle = toneStyles[tone] || toneStyles.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: toneStyle.bg }, style]}>
      <AppText variant="caption" style={{ color: toneStyle.text, fontWeight: "700" }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
