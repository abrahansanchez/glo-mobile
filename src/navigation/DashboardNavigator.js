import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import DashboardOverviewScreen from "../screens/DashboardOverviewScreen";
import CallsScreen from "../screens/CallsScreen";
import AppointmentsScreen from "../screens/AppointmentsScreen";
import VoicemailsScreen from "../screens/VoicemailsScreen";
import AnalyticsSummaryScreen from "../screens/AnalyticsSummaryScreen";
import TranscriptsScreen from "../screens/TranscriptsScreen";
import TranscriptDetailScreen from "../screens/TranscriptDetailScreen";
import CallNavigator from "./CallNavigator";
import SettingsScreen from "../screens/SettingsScreen";
import AccountScreen from "../screens/settings/AccountScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function DashboardTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 72,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tab.Screen name="Overview" component={DashboardOverviewScreen} />
      <Tab.Screen name="Calls" component={CallsScreen} />
      <Tab.Screen name="Appointments" component={AppointmentsScreen} options={{ tabBarLabel: "Schedule" }} />
      <Tab.Screen name="Voicemails" component={VoicemailsScreen} options={{ tabBarLabel: "Voicemail" }} />
      <Tab.Screen name="Transcripts" component={TranscriptsScreen} options={{ tabBarLabel: "Transc." }} />
      <Tab.Screen name="Analytics" component={AnalyticsSummaryScreen} options={{ tabBarLabel: "Insights" }} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function DashboardNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Main dashboard tabs */}
      <Stack.Screen name="DashboardTabs" component={DashboardTabs} />

      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen name="TranscriptDetail" component={TranscriptDetailScreen} />

      {/* Call flow (modal-style) */}
      <Stack.Screen name="CallFlow" component={CallNavigator} />
    </Stack.Navigator>
  );
}
