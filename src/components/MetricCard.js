import { StyleSheet } from "react-native";
import AppCard from "./ui/AppCard";
import AppText from "./ui/AppText";
import { spacing } from "../ui/tokens";

export default function MetricCard({ label, value, description }) {
  return (
    <AppCard style={styles.card}>
      <AppText style={styles.value}>{value}</AppText>
      <AppText style={styles.label}>{label}</AppText>
      {description ? <AppText variant="caption" style={styles.description}>{description}</AppText> : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  value: {
    fontSize: 28,
    fontWeight: "900",
  },
  label: {
    marginTop: spacing.xs,
    fontWeight: "700",
  },
  description: {
    marginTop: spacing.xs,
  },
});
