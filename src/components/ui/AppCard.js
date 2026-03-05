import React from "react";
import { View, StyleSheet } from "react-native";
import { radii, spacing } from "../../ui/tokens";
import { useTheme } from "../../theme/ThemeContext";

export default function AppCard({ style, children }) {
  const { colors } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
});
