import React from "react";
import { View, Text, StyleSheet } from "react-native";
import ScreenContainer from "../components/layout/ScreenContainer";

export default function InboxScreen() {
  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.title}>Inbox</Text>
        <Text style={styles.body}>Coming soon</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: "900", marginBottom: 10 },
  body: { color: "#4b5563", fontSize: 15 },
});
