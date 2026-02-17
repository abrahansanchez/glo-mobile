import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Analytics from "../utils/Analytics";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    try {
      Analytics.trackError(error, { info });
    } catch (e) {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>An unexpected error occurred. Please restart the app.</Text>
          <Pressable style={styles.button} onPress={() => global?.Expo?.Updates?.reloadAsync?.() || null}>
            <Text style={styles.buttonText}>Reload</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 12 },
  message: { fontSize: 14, color: "#444", marginBottom: 18, textAlign: "center" },
  button: { paddingHorizontal: 18, paddingVertical: 10, backgroundColor: "#111", borderRadius: 8 },
  buttonText: { color: "#fff", fontWeight: "700" },
});
