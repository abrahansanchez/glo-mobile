// src/screens/AppointmentsScreen.js
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import api from "../config/api";
import LoadingState from "../components/LoadingState";

export default function AppointmentsScreen() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    loadAppointments();
  }, []);

  async function loadAppointments() {
    try {
      const res = await api.get("/appointments/upcoming");

      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.appointments || [];

      setAppointments(list);
    } catch (err) {
      console.log("Appointments error:", err.message);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading appointments..." />;
  }

  if (!appointments.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>No upcoming appointments</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={appointments}
      keyExtractor={(item) => item._id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.client}>
            {item.clientName || "Client"}
          </Text>
          <Text style={styles.meta}>
            {new Date(item.date).toLocaleString()}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    fontSize: 16,
    color: "#777",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  client: {
    fontSize: 16,
    fontWeight: "600",
  },
  meta: {
    marginTop: 4,
    color: "#666",
  },
});
