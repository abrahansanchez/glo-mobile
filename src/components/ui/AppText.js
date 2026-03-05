import React from "react";
import { Text } from "react-native";
import { type } from "../../ui/tokens";
import { useTheme } from "../../theme/ThemeContext";

const variantStyles = {
  title: type.title,
  section: type.section,
  body: type.body,
  caption: type.caption,
};

export default function AppText({ variant = "body", style, children, ...rest }) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        { color: colors.textPrimary, fontSize: 15 },
        variantStyles[variant] || variantStyles.body,
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}
