import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import DashboardOverviewScreen from "../screens/DashboardOverviewScreen";
import CallsScreen from "../screens/CallsScreen";
import AppointmentsScreen from "../screens/AppointmentsScreen";
import VoicemailsScreen from "../screens/VoicemailsScreen";
import AnalyticsSummaryScreen from "../screens/AnalyticsSummaryScreen";
import CallNavigator from "./CallNavigator";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function DashboardTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Overview" component={DashboardOverviewScreen} />
      <Tab.Screen name="Calls" component={CallsScreen} />
      <Tab.Screen name="Appointments" component={AppointmentsScreen} />
      <Tab.Screen name="Voicemails" component={VoicemailsScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsSummaryScreen} />
    </Tab.Navigator>
  );
}

export default function DashboardNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Main dashboard tabs */}
      <Stack.Screen name="DashboardTabs" component={DashboardTabs} />

      {/* Call flow (modal-style) */}
      <Stack.Screen name="CallFlow" component={CallNavigator} />
    </Stack.Navigator>
  );
}
