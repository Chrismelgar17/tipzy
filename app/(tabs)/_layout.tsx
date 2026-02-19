import { Tabs } from "expo-router";
import { Home, Map, User, Ticket } from "lucide-react-native";
import React from "react";
import { theme } from "@/constants/theme";
import { useAuth } from "@/hooks/auth-context";
import { SignInModal } from "@/components/SignInModal";

export default function TabLayout() {
  const { showSignInModal, setShowSignInModal, signInPrompt } = useAuth();

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.colors.purple,
          tabBarInactiveTintColor: theme.colors.text.tertiary,
          tabBarStyle: {
            backgroundColor: theme.colors.card,
            borderTopColor: theme.colors.border,
            borderTopWidth: 1,
            height: 88,
            paddingBottom: 34,
            paddingTop: 8,
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
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: "Map",
            tabBarIcon: ({ color, size }) => <Map size={size} color={color} />,
            headerTitle: "Nearby Venues",
          }}
        />
        <Tabs.Screen
          name="tickets"
          options={{
            title: "Tickets",
            tabBarIcon: ({ color, size }) => <Ticket size={size} color={color} />,
            headerTitle: "My Tickets",
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
            headerTitle: "My Profile",
          }}
        />
      </Tabs>
      
      <SignInModal
        visible={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        subtitle={signInPrompt}
      />
    </>
  );
}