import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/hooks/auth-context';
import { theme } from '@/constants/theme';

export default function Index() {
  const { isLoading, isAuthenticated, isBusiness, isAdmin } = useAuth();

  // Wait for auth to rehydrate before deciding where to send the user
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.purple} />
      </View>
    );
  }

  if (isAuthenticated && (isBusiness || isAdmin)) {
    return <Redirect href="/(business-tabs)/dashboard" />;
  }

  return <Redirect href="/(tabs)/home" />;
}