import { useContext } from "react";
import { View, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthContext } from "../auth/authContext";
import LoginScreen from "../screens/LoginScreen";
import SubscriptionGateScreen from "../screens/SubscriptionGateScreen";
import DashboardNavigator from "./DashboardNavigator";
import IncomingCallScreen from "../screens/call/IncomingCallScreen";
import { getSubscriptionError } from "../utils/subscriptionGuard";

const RootStack = createNativeStackNavigator();

export default function AppNavigator() {
  const { authenticated, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ padding: 24 }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {/* Auth */}
        {!authenticated ? (
          <RootStack.Screen name="Login" component={LoginScreen} />
        ) : getSubscriptionError() ? (
          <RootStack.Screen
            name="SubscriptionGate"
            component={SubscriptionGateScreen}
            initialParams={{ reason: getSubscriptionError() }}
          />
        ) : (
          <RootStack.Screen
            name="Dashboard"
            component={DashboardNavigator}
          />
        )}

        {/* 🔔 Incoming Call Modal (overlays dashboard) */}
        <RootStack.Screen
          name="IncomingCall"
          component={IncomingCallScreen}
          options={{ presentation: "modal" }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
