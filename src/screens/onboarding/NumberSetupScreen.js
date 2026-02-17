import React, { useContext, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, TextInput, Linking } from "react-native";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import OnboardingHeader from "../../onboarding/OnboardingHeader";

export default function NumberSetupScreen({ navigation, route }) {
  const { updateStep } = useContext(OnboardingContext);
  const option = route?.params?.option || "SKIP";
  const [phone, setPhone] = useState("");
  const assignedNumber = "555-0100"; // placeholder for new assigned number

  useEffect(() => {
    updateStep("NUMBER_SETUP");
  }, []);

  function next() {
    navigation.navigate("Permissions");
  }

  function callNumber(num) {
    if (!num) return;
    Linking.openURL(`tel:${num}`);
  }

  return (
    <View style={styles.container}>
      <OnboardingHeader />
      <Text style={styles.title}>Number Setup</Text>

      {option === "FORWARD_EXISTING" ? (
        <>
          <Text style={styles.text}>Enter your current barber number to test forwarding.</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="(555) 555-5555"
            keyboardType="phone-pad"
            style={[styles.input, { marginTop: 8 }]}
          />
          <Pressable style={[styles.button, { marginTop: 8 }]} onPress={() => callNumber(phone)}>
            <Text style={styles.buttonText}>Call this number to test</Text>
          </Pressable>
        </>
      ) : option === "NEW_GLO_NUMBER" ? (
        <>
          <Text style={styles.text}>Assigned temporary Glō number:</Text>
          <Text style={[styles.text, { marginBottom: 8 }]}>{assignedNumber}</Text>
          <Pressable style={[styles.button, { marginTop: 4 }]} onPress={() => callNumber(assignedNumber)}>
            <Text style={styles.buttonText}>Call assigned number</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.text}>You skipped number setup.</Text>
          <Text style={styles.text}>You can finish this later in Settings.</Text>
        </>
      )}

      <Pressable style={styles.button} onPress={next}>
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "900", marginBottom: 12 },
  text: { fontWeight: "700", color: "#333", marginBottom: 8 },
  button: { backgroundColor: "#000", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 14 },
  buttonText: { color: "#fff", fontWeight: "900" },
});
