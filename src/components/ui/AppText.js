import React from "react";
import { Text } from "react-native";
import { type } from "../../ui/tokens";
import { useTheme } from "../../theme/ThemeContext";

const { color: _titleColor, ...titleStyle } = type.title;
const { color: _sectionColor, ...sectionStyle } = type.section;
const { color: _bodyColor, ...bodyStyle } = type.body;
const { color: _captionColor, ...captionStyle } = type.caption;

const variantStyles = {
  title: titleStyle,
  section: sectionStyle,
  body: bodyStyle,
  caption: captionStyle,
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
