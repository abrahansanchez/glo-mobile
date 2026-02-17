import React, { useContext, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import OnboardingHeader from "../../onboarding/OnboardingHeader";

const DEFAULT_SERVICES = [
  { id: "haircut", name: "Haircut", enabled: true, price: "" },
  { id: "beard", name: "Beard Trim", enabled: false, price: "" },
  { id: "combo", name: "Haircut + Beard", enabled: false, price: "" },
  { id: "kids", name: "Kids Haircut", enabled: false, price: "" },
];

export default function ServicesSetupScreen({ navigation }) {
  const { updateStep, updateData, onboardingData } = useContext(OnboardingContext);

  const [services, setServices] = useState(
    onboardingData?.services || DEFAULT_SERVICES
  );

  useEffect(() => {
    updateStep("SERVICES_SETUP");
  }, [updateStep]);

  function toggleService(id) {
    setServices(
      services.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      )
    );
  }

  function updatePrice(id, price) {
    setServices(
      services.map((s) =>
        s.id === id ? { ...s, price } : s
      )
    );
  }

  async function next() {
    await updateData({ services });
    navigation.navigate("PhoneChoice");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <OnboardingHeader showLogout={false} showRestart={true} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Services</Text>
        <Text style={styles.subtitle}>
          Select services you offer. You can add more later.
        </Text>

        {services.map((service) => (
          <View key={service.id} style={styles.serviceCard}>
            <Pressable
              onPress={() => toggleService(service.id)}
              style={styles.serviceRow}
            >
              <View
                style={[
                  styles.checkbox,
                  service.enabled && styles.checkboxOn,
                ]}
              >
                {service.enabled && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
              <Text style={styles.serviceName}>{service.name}</Text>
            </Pressable>

            {service.enabled && (
              <TextInput
                placeholder="Price (optional)"
                value={service.price}
                onChangeText={(price) => updatePrice(service.id, price)}
                keyboardType="decimal-pad"
                style={styles.priceInput}
              />
            )}
          </View>
        ))}

        <Pressable style={styles.button} onPress={next}>
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  title: { fontSize: 24, fontWeight: "900", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 20, fontWeight: "500" },
  serviceCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#ccc",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkboxOn: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  checkmark: { color: "#fff", fontWeight: "900", fontSize: 14 },
  serviceName: { fontWeight: "700", fontSize: 16 },
  priceInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    marginTop: 8,
  },
  button: {
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: { color: "#fff", fontWeight: "900" },
});
