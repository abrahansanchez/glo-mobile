import React, { useContext, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import OnboardingHeader from "../../onboarding/OnboardingHeader";

export default function NumberChoiceScreen({ navigation }) {
  const { updateStep } = useContext(OnboardingContext);

  useEffect(() => {
    updateStep("NUMBER_CHOICE");
  }, []);

  function choose(option) {
    navigation.navigate("NumberSetup", { option });
  }

  return (
    <View style={styles.container}>
      <OnboardingHeader />
      <Text style={styles.title}>Which number should Glō answer for you?</Text>

      <Pressable style={styles.card} onPress={() => choose("FORWARD_EXISTING")}>
        <Text style={styles.cardTitle}>Use my current barber number (Recommended)</Text>
        <Text style={styles.cardSub}>Clients keep calling the same number. We guide you step by step.</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => choose("NEW_GLO_NUMBER")}>
        <Text style={styles.cardTitle}>Get a new Glō number</Text>
        <Text style={styles.cardSub}>Use this as your business number. You can change later.</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => choose("SKIP")}>
        <Text style={styles.cardTitle}>I’ll set this up later (Skip)</Text>
        <Text style={styles.cardSub}>You can finish setup anytime.</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "900", marginBottom: 16 },
  card: { borderWidth: 1, borderColor: "#ddd", borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTitle: { fontWeight: "900", marginBottom: 6, fontSize: 16 },
  cardSub: { color: "#333", fontWeight: "600" },
});
