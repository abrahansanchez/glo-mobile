import React from "react";
import { Pressable, StyleSheet } from "react-native";
import AppText from "./AppText";
import { spacing, radii } from "../../ui/tokens";
import { useTheme } from "../../theme/ThemeContext";

export default function AppButton({
  label,
  onPress,
  disabled = false,
  variant = "primary",
  style,
  textStyle,
}) {
  const { colors } = useTheme();
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isDanger = variant === "danger";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        isPrimary && { backgroundColor: colors.accent },
        isSecondary && { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
        isDanger && { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
        disabled && styles.disabled,
        style,
      ]}
    >
      <AppText
        style={[
          styles.baseText,
          isPrimary && { color: colors.bg },
          isSecondary && { color: colors.textPrimary },
          isDanger && { color: colors.danger },
          textStyle,
        ]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.55,
  },
  baseText: {
    fontWeight: "800",
  },
});
