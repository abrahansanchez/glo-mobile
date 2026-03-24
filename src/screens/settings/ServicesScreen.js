import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import AppText from "../../components/ui/AppText";
import AppButton from "../../components/ui/AppButton";
import api from "../../config/api";

export default function ServicesScreen({ navigation }) {
  const { colors } = useTheme();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDuration, setNewDuration] = useState("");

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    try {
      const res = await api.get("/services");
      setServices(res.data?.services || []);
    } catch (e) {
      console.log("[SERVICES] load failed:", e?.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    const name = newName.trim();
    if (!name) {
      Alert.alert("Required", "Please enter a service name.");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post("/services", {
        name,
        price: newPrice ? Number(newPrice) : null,
        durationMinutes: newDuration ? Number(newDuration) : null,
      });
      setServices(res.data?.services || []);
      setNewName("");
      setNewPrice("");
      setNewDuration("");
    } catch (e) {
      Alert.alert("Error", "Failed to add service. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(serviceId) {
    Alert.alert(
      "Delete service",
      "Are you sure you want to remove this service?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await api.delete(`/services/${serviceId}`);
              setServices(res.data?.services || []);
            } catch (e) {
              Alert.alert("Error", "Failed to delete service.");
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <AppText style={{ color: colors.textSecondary }}>Loading services...</AppText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AppText style={[styles.subtitle, { color: colors.textSecondary }]}>
          Add your services and prices. Your AI will use these to answer client questions and book appointments.
        </AppText>

        <View style={[styles.addCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppText style={[styles.addTitle, { color: colors.textPrimary }]}>Add a service</AppText>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Service name (e.g. Fade)"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.bg }]}
          />
          <View style={styles.row}>
            <TextInput
              value={newPrice}
              onChangeText={setNewPrice}
              placeholder="Price ($)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              style={[styles.inputHalf, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.bg }]}
            />
            <TextInput
              value={newDuration}
              onChangeText={setNewDuration}
              placeholder="Duration (min)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              style={[styles.inputHalf, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.bg }]}
            />
          </View>
          <AppButton
            variant="primary"
            label={saving ? "Adding..." : "Add service"}
            onPress={handleAdd}
            disabled={saving}
            style={styles.addBtn}
          />
        </View>

        {services.length > 0 ? (
          <>
            <AppText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Your services ({services.length})
            </AppText>
            {services.map((service) => (
              <View
                key={String(service._id)}
                style={[styles.serviceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.serviceInfo}>
                  <AppText style={[styles.serviceName, { color: colors.textPrimary }]}>
                    {service.name}
                  </AppText>
                  <View style={styles.serviceMeta}>
                    {service.price != null ? (
                      <AppText style={[styles.serviceDetail, { color: colors.accent }]}>
                        ${service.price}
                      </AppText>
                    ) : null}
                    {service.durationMinutes != null ? (
                      <AppText style={[styles.serviceDetail, { color: colors.textMuted }]}>
                        {service.durationMinutes} min
                      </AppText>
                    ) : null}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(String(service._id))}
                  style={[styles.deleteBtn, { borderColor: colors.border, backgroundColor: colors.bg }]}
                >
                  <AppText style={{ color: colors.danger, fontSize: 12, fontWeight: "600" }}>Remove</AppText>
                </TouchableOpacity>
              </View>
            ))}
          </>
        ) : (
          <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <AppText style={[styles.emptyText, { color: colors.textMuted }]}>
              No services added yet. Add your first service above.
            </AppText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 20, paddingBottom: 40 },
  subtitle: { fontSize: 13, lineHeight: 20, marginBottom: 20 },
  addCard: {
    borderWidth: 0.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  addTitle: { fontSize: 14, fontWeight: "600", marginBottom: 12 },
  input: {
    borderWidth: 0.5,
    borderRadius: 10,
    padding: 11,
    fontSize: 14,
    marginBottom: 10,
  },
  row: { flexDirection: "row", gap: 10, marginBottom: 10 },
  inputHalf: {
    flex: 1,
    borderWidth: 0.5,
    borderRadius: 10,
    padding: 11,
    fontSize: 14,
  },
  addBtn: { marginTop: 4 },
  sectionTitle: { fontSize: 12, fontWeight: "600", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  serviceCard: {
    borderWidth: 0.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  serviceMeta: { flexDirection: "row", gap: 10 },
  serviceDetail: { fontSize: 12, fontWeight: "500" },
  deleteBtn: {
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  emptyState: {
    borderWidth: 0.5,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 20 },
});
