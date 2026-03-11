import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import AppText from "./ui/AppText";

export default function LoadingState({ message = "Loading..." }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={colors.textPrimary} />
      <AppText style={[styles.text, { color: colors.textSecondary }]}>{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    marginTop: 10,
    fontWeight: "600",
  },
});
