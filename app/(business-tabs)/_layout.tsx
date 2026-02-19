import { Tabs } from "expo-router";
import { Home, Gift, Plus, ShoppingCart, Settings } from "lucide-react-native";
import React, { useEffect } from "react";
import { theme } from "@/constants/theme";
import { useAuth } from "@/hooks/auth-context";
import { router } from "expo-router";
import { View, StyleSheet } from "react-native";

const styles = StyleSheet.create({
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: theme.colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default function BusinessTabLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'business')) {
      router.replace('/(auth)/signin');
    }
  }, [isAuthenticated, isLoading, user]);

  if (!isAuthenticated || user?.role !== 'business') {
    return null;
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
        options={{
          title: "Offers",
          tabBarIcon: ({ color, size }) => <Gift size={size} color={color} />,
          headerTitle: "Offers",
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={styles.addButton}>
              <Plus size={28} color={theme.colors.white} />
            </View>
          ),
          tabBarLabel: () => null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, size }) => <ShoppingCart size={size} color={color} />,
          headerTitle: "Orders",
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