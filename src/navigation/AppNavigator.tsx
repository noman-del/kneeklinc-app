import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { View, Text, StyleSheet } from "react-native";
import { useState, useEffect } from "react";
import { messageApi } from "../services/api";

import LoginScreen from "../screens/auth/LoginScreen";
import SignupScreen from "../screens/auth/SignupScreen";
import OTPVerificationScreen from "../screens/auth/OTPVerificationScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";

import HomeScreen from "../screens/main/HomeScreen";
import XrayUploadScreen from "../screens/main/XrayUploadScreen";
import ProgressScreen from "../screens/main/ProgressScreen";
import AppointmentsScreen from "../screens/main/AppointmentsScreen";
import MessagesScreen from "../screens/main/MessagesScreen";
import ProfileScreen from "../screens/main/ProfileScreen";
import BookAppointmentScreen from "../screens/main/BookAppointmentScreen";
import ConversationScreen from "../screens/main/ConversationScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const data: any = await messageApi.getConversations();
      const conversations = Array.isArray(data) ? data : data?.conversations || [];
      const total = conversations.reduce((sum: number, conv: any) => sum + (conv.unreadCount || 0), 0);
      setUnreadCount(total);
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        console.log("Failed to fetch unread count:", error);
      }
    }
  };

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: "#9ca3af",
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="home" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="XrayUpload"
        component={XrayUploadScreen}
        options={{
          tabBarLabel: "AI Analysis",
          tabBarIcon: ({ color, size }) => <Icon name="brain" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="chart-line" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="calendar-clock" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <View>
              <Icon name="message" size={size} color={color} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="account" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    right: -8,
    top: -4,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
});

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} />
          <Stack.Screen name="Conversation" component={ConversationScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
