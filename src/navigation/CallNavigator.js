import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import IncomingCallScreen from "../screens/call/IncomingCallScreen";
import CallEndedScreen from "../screens/call/CallEndedScreen";

const Stack = createNativeStackNavigator();

export default function CallNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="IncomingCall"
        component={IncomingCallScreen}
      />
      <Stack.Screen
        name="CallEnded"
        component={CallEndedScreen}
      />
    </Stack.Navigator>
  );
}
