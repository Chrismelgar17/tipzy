import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/theme-context';

export default function OnboardingLayout() {
  const { theme } = useTheme();
  
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="business-form" />
      <Stack.Screen name="business-gallery" />
      <Stack.Screen name="business-hours" />
      <Stack.Screen name="business-confirmation" />
    </Stack>
  );
}