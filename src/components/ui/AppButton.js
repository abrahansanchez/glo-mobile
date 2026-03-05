import React from "react";
import { Pressable, StyleSheet } from "react-native";
import AppText from "./AppText";
import { colors, spacing, radii } from "../../ui/tokens";

export default function AppButton({
  label,
  onPress,
  disabled = false,
  variant = "primary",
  style,
  textStyle,
}) {
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isDanger = variant === "danger";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        isDanger && styles.danger,
        disabled && styles.disabled,
        style,
      ]}
    >
      <AppText
        style={[
          styles.baseText,
          isPrimary && styles.primaryText,
          isSecondary && styles.secondaryText,
          isDanger && styles.dangerText,
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
  primary: {
    backgroundColor: "#000",
  },
  secondary: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: "#eee",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  disabled: {
    opacity: 0.55,
  },
  baseText: {
    fontWeight: "800",
  },
  primaryText: {
    color: "#fff",
  },
  secondaryText: {
    color: colors.textPrimary,
  },
  dangerText: {
    color: colors.danger,
  },
});
