import React from "react";
import { SafeAreaView, View } from "react-native";

export default function ScreenContainer({ children, style }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={[{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

