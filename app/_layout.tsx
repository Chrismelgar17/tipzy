import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/hooks/auth-context";
import { TicketsProvider } from "@/hooks/tickets-context";
import { ChatProvider } from "@/hooks/chat-context";
import { ThemeProvider, useTheme } from "@/hooks/theme-context";
import { VenuesProvider } from "@/hooks/venues-context";
import { CapacityProvider } from "@/hooks/capacity-context";
import { StatusBar } from "expo-status-bar";
import { ErrorBoundary } from "react-error-boundary";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { clearAllAppData } from "@/utils/storage";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  const { theme } = useTheme();
  
  useEffect(() => {
    console.error('App Error:', error);

    // If it's a JSON parse error, clear all app data
    if (error.message.includes('JSON') || error.message.includes('Unexpected character')) {
      console.warn('JSON parse error detected, clearing all app data');
      clearAllAppData().then(() => {
        resetErrorBoundary();
      });
      return;
    }

    // Auto-reset after 3 seconds for other errors
    const timer = setTimeout(() => {
      resetErrorBoundary();
    }, 3000);

    return () => clearTimeout(timer);
  }, [error, resetErrorBoundary]);

  const errorStyles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      padding: 20,
    },
    title: {
      color: theme.colors.text.primary,
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 16,
      textAlign: 'center',
    },
    subtitle: {
      color: theme.colors.text.secondary,
      fontSize: 16,
      marginBottom: 24,
      textAlign: 'center',
    },
    button: {
      backgroundColor: theme.colors.purple,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    buttonText: {
      color: theme.colors.white,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <View style={errorStyles.container}>
      <Text style={errorStyles.title}>Something went wrong</Text>
      <Text style={errorStyles.subtitle}>
        Redirecting you to home...
      </Text>
      <TouchableOpacity
        style={errorStyles.button}
        onPress={async () => {
          // Clear all data if it's a JSON error
          if (error.message.includes('JSON') || error.message.includes('Unexpected character')) {
            await clearAllAppData();
          }
          resetErrorBoundary();
        }}
      >
        <Text style={errorStyles.buttonText}>Go to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

function RootLayoutNav() {
  const { theme, themeMode } = useTheme();
  
  return (
    <>
      <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.text.primary,
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerBackTitle: "Back",
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(business-tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="venue/[id]" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="checkout" options={{ title: 'Checkout', presentation: 'modal' }} />
        <Stack.Screen name="ticket/[id]" options={{ title: 'Ticket Details', presentation: 'modal' }} />
        <Stack.Screen name="scanner" options={{ title: 'Scan Ticket', presentation: 'modal' }} />
        <Stack.Screen name="admin" options={{ title: 'Admin Dashboard' }} />
        <Stack.Screen name="wallet" options={{ title: 'My Tickets' }} />
        <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile', presentation: 'modal' }} />
        <Stack.Screen name="forgot-password" options={{ title: 'Reset Password', presentation: 'modal' }} />

        <Stack.Screen name="business-profile" options={{ title: 'Business Profile' }} />
        <Stack.Screen name="favorites" options={{ title: 'Favorites' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="privacy-security" options={{ title: 'Privacy & Security' }} />
        <Stack.Screen name="payment-methods" options={{ title: 'Payment Methods' }} />
        <Stack.Screen name="privacy-policy" options={{ title: 'Privacy Policy' }} />
        <Stack.Screen name="terms-conditions" options={{ title: 'Terms & Conditions' }} />
      </Stack>
    </>
  );
}

function ThemedRootLayout() {
  const { theme } = useTheme();
  
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check for corrupted data on app startup
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        const keys = await AsyncStorage.default.getAllKeys();
        
        for (const key of keys) {
          try {
            const value = await AsyncStorage.default.getItem(key);
            if (value) {
              try {
                JSON.parse(value);
              } catch {
                console.warn(`Removing corrupted data for key: ${key}`);
                await AsyncStorage.default.removeItem(key);
              }
            }
          } catch (error) {
            console.warn(`Error checking key ${key}, removing:`, error);
            await AsyncStorage.default.removeItem(key);
          }
        }
      } catch (error) {
        console.error('Error during app initialization:', error);
      } finally {
        SplashScreen.hideAsync();
      }
    };
    
    initializeApp();
  }, []);

  const rootStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
  });

  return (
    <GestureHandlerRootView style={rootStyles.container}>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onError={(error: Error, errorInfo: any) => {
          console.error('Navigation Error:', error, errorInfo);
        }}
        onReset={() => {
          console.log('Resetting app state');
        }}
      >
        <AuthProvider>
          <VenuesProvider>
            <CapacityProvider>
              <TicketsProvider>
                <ChatProvider>
                  <RootLayoutNav />
                </ChatProvider>
              </TicketsProvider>
            </CapacityProvider>
          </VenuesProvider>
        </AuthProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <ThemeProvider>
          <ThemedRootLayout />
        </ThemeProvider>
      </trpc.Provider>
    </QueryClientProvider>
  );
}