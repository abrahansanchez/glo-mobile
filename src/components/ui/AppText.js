import React from "react";
import { Text } from "react-native";
import { colors, type } from "../../ui/tokens";

const variantStyles = {
  title: type.title,
  section: type.section,
  body: type.body,
  caption: type.caption,
};

export default function AppText({ variant = "body", style, children, ...rest }) {
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
