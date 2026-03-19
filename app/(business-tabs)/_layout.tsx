import { Tabs, Redirect, router } from "expo-router";
import { Home, CalendarDays, Settings, ArrowLeft, HelpCircle } from "lucide-react-native";
import React from "react";
import { theme } from "@/constants/theme";
import { useAuth } from "@/hooks/auth-context";
import { View, StyleSheet, TouchableOpacity } from "react-native";

const styles = StyleSheet.create({});

export default function BusinessTabLayout() {
  const { isAuthenticated, isLoading, isBusiness, isAdmin } = useAuth();
  // isBusiness is only true when businessStatus === 'approved'
  const canAccess = isBusiness || isAdmin;

  if (isLoading) return null;

  if (!isAuthenticated || !canAccess) {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.purple,
        tabBarInactiveTintColor: theme.colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.text.primary,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          headerTitle: "Dashboard",
        }}
      />
      <Tabs.Screen
        name="offers"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="add"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="orders"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color, size }) => <CalendarDays size={size} color={color} />,
          headerTitle: "Events",
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          href: null,
          headerTitle: "Plan & Subscription",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.push('/(business-tabs)/settings')}
              style={{ paddingHorizontal: 16 }}
            >
              <ArrowLeft size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          title: "Support",
          tabBarIcon: ({ color, size }) => <HelpCircle size={size} color={color} />,
          headerTitle: "Help & Support",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
          headerTitle: "Settings",
        }}
      />
    </Tabs>
  );
}