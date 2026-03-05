import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import DashboardOverviewScreen from "../screens/DashboardOverviewScreen";
import CallsScreen from "../screens/CallsScreen";
import AppointmentsScreen from "../screens/AppointmentsScreen";
import VoicemailsScreen from "../screens/VoicemailsScreen";
import AnalyticsDashboardScreen from "../screens/AnalyticsDashboardScreen";
import BarberInsightsScreen from "../screens/BarberInsightsScreen";
import TranscriptsScreen from "../screens/TranscriptsScreen";
import TranscriptDetailScreen from "../screens/TranscriptDetailScreen";
import CallNavigator from "./CallNavigator";
import SettingsScreen from "../screens/SettingsScreen";
import InboxScreen from "../screens/InboxScreen";
import AccountScreen from "../screens/settings/AccountScreen";
import PortingStatusScreen from "../screens/onboarding/PortingStatusScreen";
import PortingDocumentsScreen from "../screens/onboarding/PortingDocumentsScreen";
import { AuthContext } from "../auth/authContext";
import { isAdminBarber } from "../auth/adminAccess";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function DashboardTabs() {
  const { barber } = useContext(AuthContext);
  const isAdmin = isAdminBarber(barber);
  const insightsComponent = isAdmin ? AnalyticsDashboardScreen : BarberInsightsScreen;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: "#111827",
        tabBarInactiveTintColor: "#9ca3af",
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
        tabBarIconStyle: {
          alignSelf: "center",
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardOverviewScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={Math.max(size, 22)} />,
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={AppointmentsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="calendar" color={color} size={Math.max(size, 22)} />,
        }}
      />
      <Tab.Screen
        name="Inbox"
        component={InboxScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="inbox" color={color} size={Math.max(size, 22)} />,
        }}
      />
      <Tab.Screen
        name="Insights"
        component={insightsComponent}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" color={color} size={Math.max(size, 22)} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="settings" color={color} size={Math.max(size, 22)} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function DashboardNavigator() {
  const { barber } = useContext(AuthContext);
  const isAdmin = isAdminBarber(barber);
  const insightsComponent = isAdmin ? AnalyticsDashboardScreen : BarberInsightsScreen;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Main dashboard tabs */}
      <Stack.Screen name="DashboardTabs" component={DashboardTabs} />

      {/* Legacy/secondary screens still reachable without top-level tab exposure */}
      <Stack.Screen name="Calls" component={CallsScreen} />
      <Stack.Screen name="Voicemails" component={VoicemailsScreen} />
      <Stack.Screen name="Transcripts" component={TranscriptsScreen} />
      <Stack.Screen name="Appointments" component={AppointmentsScreen} />
      <Stack.Screen name="Overview" component={DashboardOverviewScreen} />
      <Stack.Screen name="Analytics" component={insightsComponent} />

      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen name="PortingStatus" component={PortingStatusScreen} />
      <Stack.Screen name="PortingDocuments" component={PortingDocumentsScreen} />
      <Stack.Screen name="TranscriptDetail" component={TranscriptDetailScreen} />

      {/* Call flow (modal-style) */}
      <Stack.Screen name="CallFlow" component={CallNavigator} />
    </Stack.Navigator>
  );
}
