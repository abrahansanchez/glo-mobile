import React from "react";
import { SafeAreaView, View } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

export default function ScreenContainer({ children, style }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}
