import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0b0b",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 8,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 16,
    color: "#bdbdbd",
    textAlign: "center",
    marginBottom: 24,
  },

  card: {
    width: "100%",
    backgroundColor: "#141414",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },

  primaryButton: {
    width: "100%",
    backgroundColor: "#ffffff",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },

  primaryButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "800",
  },

  secondaryButton: {
    width: "100%",
    backgroundColor: "#1a1a1a",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },

  secondaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  dangerButton: {
    width: "100%",
    backgroundColor: "#2a0f0f",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  dangerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});

export default styles;
