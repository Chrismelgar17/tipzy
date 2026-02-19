import { Stack, router } from "expo-router";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { theme } from "@/constants/theme";
import { useEffect } from "react";

export default function NotFoundScreen() {
  // Auto-redirect to home after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(tabs)/home');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleGoHome = () => {
    router.replace('/(tabs)/home');
  };

  return (
    <>
      <Stack.Screen options={{ title: "Oops!", headerStyle: { backgroundColor: theme.colors.background }, headerTintColor: theme.colors.text.primary }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn&apos;t exist.</Text>
        <Text style={styles.subtitle}>Redirecting you to home...</Text>

        <TouchableOpacity style={styles.button} onPress={handleGoHome}>
          <Text style={styles.buttonText}>Go to Home Now</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xl,
    textAlign: "center",
  },
  button: {
    backgroundColor: theme.colors.purple,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.white,
  },
});
