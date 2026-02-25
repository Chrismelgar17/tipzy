import React from 'react';
import { View, Text } from 'react-native';
import { Ticket } from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-context';

// Full tickets implementation is preserved in tickets.FULL_IMPLEMENTATION.tsx.bak
// To re-enable: replace this file with the contents of that .bak file.

export default function TicketsScreen() {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <Ticket size={72} color={theme.colors.purple} strokeWidth={1.5} />
      <Text style={{ fontSize: 28, fontWeight: '700', color: theme.colors.text.primary, marginTop: 24, marginBottom: 12, textAlign: 'center' }}>
        Coming Soon
      </Text>
      <Text style={{ fontSize: 16, color: theme.colors.text.secondary, textAlign: 'center', lineHeight: 24 }}>
        Ticket purchasing and management will be available here very soon. Stay tuned!
      </Text>
    </View>
  );
}