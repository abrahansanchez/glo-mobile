import { View, Text, StyleSheet } from "react-native";

export default function StatCard({ label, value, sublabel }) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    margin: 6,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  value: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
  },
  label: {
    marginTop: 6,
    fontSize: 14,
    color: "#555",
  },
  sublabel: {
    marginTop: 4,
    fontSize: 12,
    color: "#999",
  },
});
