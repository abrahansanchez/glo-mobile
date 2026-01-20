import { View, Text, Button, Linking } from "react-native";

export default function SubscriptionGateScreen({ reason }) {
  const openCheckout = () => {
    Linking.openURL("https://glo-backend-yaho.onrender.com/subscribe");
  };

  const getMessage = () => {
    switch (reason) {
      case "SUBSCRIPTION_PAST_DUE":
        return "Your subscription is past due. Please update your payment.";
      case "INCOMPLETE":
        return "Your subscription setup is incomplete.";
      default:
        return "An active subscription is required to continue.";
    }
  };

  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 18, marginBottom: 16 }}>
        {getMessage()}
      </Text>
      <Button title="Subscribe / Manage Billing" onPress={openCheckout} />
    </View>
  );
}
