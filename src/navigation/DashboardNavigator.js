import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

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
import BusinessHoursScreen from "../screens/settings/BusinessHoursScreen";
import ForwardingSettingsScreen from "../screens/settings/ForwardingSettingsScreen";
import ServicesScreen from "../screens/settings/ServicesScreen";
import PortingStatusScreen from "../screens/onboarding/PortingStatusScreen";
import PortingDocumentsScreen from "../screens/onboarding/PortingDocumentsScreen";
import { AuthContext } from "../auth/authContext";
import { isAdminBarber } from "../auth/adminAccess";
import { ActivityIcon, HomeIcon, InboxIcon, ScheduleIcon, SettingsIcon } from "../components/ui/TabIcon";

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
        tabBarActiveTintColor: "rgba(0,210,220,0.9)",
        tabBarInactiveTintColor: "rgba(255,255,255,0.25)",
        tabBarStyle: {
          backgroundColor: "#040b12",
          borderTopColor: "rgba(0,180,200,0.1)",
          borderTopWidth: 0.5,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
        },
        tabBarShowLabel: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardOverviewScreen}
        options={{
          tabBarIcon: ({ color }) => <HomeIcon color={color} size={22} />,
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={AppointmentsScreen}
        options={{
          tabBarIcon: ({ color }) => <ScheduleIcon color={color} size={22} />,
        }}
      />
      <Tab.Screen
        name="Inbox"
        component={InboxScreen}
        options={{
          tabBarIcon: ({ color }) => <InboxIcon color={color} size={22} />,
        }}
      />
      <Tab.Screen
        name="Insights"
        component={insightsComponent}
        options={{
          tabBarIcon: ({ color }) => <ActivityIcon color={color} size={22} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color }) => <SettingsIcon color={color} size={22} />,
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
      <Stack.Screen name="BusinessHours" component={BusinessHoursScreen} />
      <Stack.Screen name="Services" component={ServicesScreen} />
      <Stack.Screen name="ForwardingSettings" component={ForwardingSettingsScreen} />
      <Stack.Screen name="PortingStatus" component={PortingStatusScreen} />
      <Stack.Screen name="PortingDocuments" component={PortingDocumentsScreen} />
      <Stack.Screen name="TranscriptDetail" component={TranscriptDetailScreen} />

      {/* Call flow (modal-style) */}
      <Stack.Screen name="CallFlow" component={CallNavigator} />
    </Stack.Navigator>
  );
}
