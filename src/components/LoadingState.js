import { View, ActivityIndicator, StyleSheet } from "react-native";

export default function LoadingState({ message = "Loading..." }) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color="#111" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
