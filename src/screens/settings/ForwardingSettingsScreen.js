import React, { useContext, useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  Platform,
} from "react-native";
import api from "../../config/api";
import { AuthContext } from "../../auth/authContext";
import { OnboardingContext } from "../../onboarding/OnboardingContext";
import { carrierCodes } from "../../utils/forwardingCodes";
import { getStrings, normalizeLanguage } from "../../utils/i18n";

export default function ForwardingSettingsScreen() {
  const { barber } = useContext(AuthContext);
  const { onboardingData } = useContext(OnboardingContext);
  const [enabled, setEnabled] = useState(false);
  const [forwardToNumber, setForwardToNumber] = useState(null);
  const [carrier, setCarrier] = useState("other");
  const t = getStrings(
    normalizeLanguage(onboardingData?.preferredLanguage || barber?.preferredLanguage)
  );

  useEffect(() => {
    fetchStatus();
  }, []);

  const normalizeCarrier = (value) => {
    const normalized = String(value || "").toLowerCase().replace(/[\s&-]/g, "");
    if (normalized.includes("tmobile")) return "tmobile";
    if (normalized.includes("att")) return "att";
    if (normalized.includes("verizon")) return "verizon";
    return "other";
  };

  const fetchStatus = async () => {
    try {
      const res = await api.get("/forwarding/status");

      setEnabled(res.data.enabled);
      setForwardToNumber(res.data.forwardToNumber);
      setCarrier(
        normalizeCarrier(
          res.data.carrier ||
            res.data.forwardingCarrier ||
            res.data.provider
        )
      );
    } catch (err) {
      console.log("Status error:", err);
    }
  };

  const openDialer = (code) => {
    const formatted =
      Platform.OS === "ios"
        ? `telprompt:${code}`
        : `tel:${encodeURIComponent(code)}`;
    Linking.openURL(formatted);
  };

  const enableForwarding = async () => {
    try {
      const res = await api.post("/forwarding/enable", {});

      const number = res.data.forwardToNumber;
      const nextCarrier = normalizeCarrier(
        res.data.carrier ||
          res.data.forwardingCarrier ||
          carrier
      );

      setEnabled(true);
      setForwardToNumber(number);
      setCarrier(nextCarrier);
      await fetchStatus();

      Alert.alert(
        t.enableForwardingTitle,
        t.enableForwardingMessage,
        [
          {
            text: t.continue,
            onPress: () => {
              const code = carrierCodes[nextCarrier].enable(number);
              openDialer(code);
            },
          },
        ]
      );
    } catch (err) {
      console.log("Enable error:", err);
    }
  };

  const disableForwarding = async () => {
    try {
      await api.post("/forwarding/disable", {});

      setEnabled(false);
      await fetchStatus();

      Alert.alert(
        t.disableForwardingTitle,
        t.disableForwardingMessage,
        [
          {
            text: t.continue,
            onPress: () => {
              const code = carrierCodes[carrier].disable;
              openDialer(code);
            },
          },
        ]
      );
    } catch (err) {
      console.log("Disable error:", err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>{t.callForwarding}</Text>

        <Text style={styles.status}>
          {enabled ? `${t.statusOn} ✅` : `${t.statusOff} ❌`}
        </Text>

        <Text style={styles.carrier}>
          {t.carrier}: {carrier.toUpperCase()}
        </Text>

        <View style={styles.actions}>
          {enabled ? (
            <TouchableOpacity style={styles.disableBtn} onPress={disableForwarding}>
              <Text style={styles.btnText}>{t.disableForwarding}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.enableBtn} onPress={enableForwarding}>
              <Text style={styles.btnText}>{t.enableForwarding}</Text>
            </TouchableOpacity>
          )}
        </View>

        {forwardToNumber && (
          <Text style={styles.number}>
            {t.routingNumber}: {forwardToNumber}
          </Text>
        )}

        <Text style={styles.hint}>
          {t.forwardingHint}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f0f0f",
  },
  container: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    color: "white",
    marginBottom: 20,
  },
  status: {
    fontSize: 20,
    color: "white",
    marginBottom: 10,
  },
  carrier: {
    color: "#aaa",
    marginBottom: 10,
  },
  actions: {
    marginTop: 30,
  },
  enableBtn: {
    backgroundColor: "#22c55e",
    padding: 15,
    borderRadius: 10,
  },
  disableBtn: {
    backgroundColor: "#ef4444",
    padding: 15,
    borderRadius: 10,
  },
  btnText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
  number: {
    color: "#aaa",
    marginTop: 20,
  },
  hint: {
    color: "#888",
    marginTop: 10,
  },
});
