import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';
import { Venue } from '@/types/models';

interface NativeMapViewProps {
  venues: Venue[];
  onMarkerPress: (venue: Venue) => void;
  getMarkerColor: (crowdCount: number) => string;
}

export default function NativeMapView({ venues, onMarkerPress, getMarkerColor }: NativeMapViewProps) {
  return (
    <View style={styles.mapContainer}>
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackText}>Map not available on web</Text>
        <Text style={styles.fallbackSubtext}>Use the mobile app to view the interactive map</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
  },
  fallbackText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  fallbackSubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
});