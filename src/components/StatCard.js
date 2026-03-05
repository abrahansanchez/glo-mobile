import { StyleSheet } from "react-native";
import AppCard from "./ui/AppCard";
import AppText from "./ui/AppText";
import { spacing } from "../ui/tokens";

export default function StatCard({ label, value, sublabel }) {
  return (
    <AppCard style={styles.card}>
      <AppText style={styles.value}>{value}</AppText>
      <AppText variant="body" style={styles.label}>{label}</AppText>
      {sublabel ? <AppText variant="caption" style={styles.sublabel}>{sublabel}</AppText> : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: spacing.lg,
    margin: 6,
  },
  value: {
    fontSize: 28,
    fontWeight: "800",
  },
  label: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
  },
  sublabel: {
    marginTop: 4,
  },
});
