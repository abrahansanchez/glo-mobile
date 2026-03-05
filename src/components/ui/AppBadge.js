import React from "react";
import { View, StyleSheet } from "react-native";
import AppText from "./AppText";
import { colors, radii, spacing } from "../../ui/tokens";

const toneStyles = {
  neutral: { bg: "#f3f4f6", text: colors.textSecondary },
  success: { bg: "#ecfdf5", text: colors.success },
  warning: { bg: "#fffbeb", text: colors.warning },
};

export default function AppBadge({ label, tone = "neutral", style }) {
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
