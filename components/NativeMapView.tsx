import React, { useMemo, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, Animated, Easing } from 'react-native';
import { User } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { Venue } from '@/types/models';

// Only import react-native-maps on native platforms
let MapView: any = null;
let Marker: any = null;

if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
}

// US center fallback when no valid venue coords are available
const US_FALLBACK_REGION = {
  latitude: 39.8283,
  longitude: -98.5795,
  latitudeDelta: 45,
  longitudeDelta: 60,
};

const mapStyle = [
  {
    elementType: 'geometry',
    stylers: [
      { color: '#1d2c4d' },
    ],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [
      { color: '#8ec3b9' },
    ],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [
      { color: '#1a3646' },
    ],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [
      { visibility: 'off' },
    ],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [
      { color: '#283d6a' },
    ],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [
      { color: '#38414e' },
    ],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [
      { color: '#17263c' },
    ],
  },
];

interface NativeMapViewProps {
  venues: Venue[];
  onMarkerPress: (venue: Venue) => void;
  getMarkerColor: (crowdCount: number) => string;
  userLocation?: { latitude: number; longitude: number } | null;
}

// Animated pulsing ring for user location
function UserLocationMarker() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.3, 0] });

  return (
    <View style={styles.userLocationWrapper}>
      {/* Pulsing ring */}
      <Animated.View
        style={[
          styles.userLocationRing,
          { transform: [{ scale: ringScale }], opacity: ringOpacity },
        ]}
      />
      {/* Inner dot with person icon */}
      <View style={styles.userLocationDot}>
        <User size={18} color="#FFFFFF" strokeWidth={2.5} />
      </View>
    </View>
  );
}

// A venue marker that waits for layout before disabling view-change tracking.
// This is required on Android for custom markers containing Text.
function VenueMarker({
  venue,
  onMarkerPress,
  getMarkerColor,
}: {
  venue: Venue;
  onMarkerPress: (v: Venue) => void;
  getMarkerColor: (n: number) => string;
}) {
  const [ready, setReady] = useState(false);

  return (
    <Marker
      coordinate={{ latitude: venue.geo.lat, longitude: venue.geo.lng }}
      onPress={() => onMarkerPress(venue)}
      tracksViewChanges={!ready}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View
        style={styles.markerOuter}
        onLayout={() => setReady(true)}
      >
        <View style={[
          styles.customMarker,
          { backgroundColor: getMarkerColor(venue.crowdCount) }
        ]}>
          <Text style={styles.markerCount}>
            {venue.crowdCount >= 100 ? '99+' : String(venue.crowdCount)}
          </Text>
        </View>
      </View>
    </Marker>
  );
}

export default function NativeMapView({ venues, onMarkerPress, getMarkerColor, userLocation }: NativeMapViewProps) {
  // Build list of venues that have real coordinates
  const mappableVenues = useMemo(
    () => venues.filter(v => v.geo && (v.geo.lat !== 0 || v.geo.lng !== 0)),
    [venues],
  );

  // Center on user location if available, else first venue, else US fallback
  const initialRegion = useMemo(() => {
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    if (mappableVenues.length === 0) return US_FALLBACK_REGION;
    const first = mappableVenues[0];
    return {
      latitude: first.geo.lat,
      longitude: first.geo.lng,
      latitudeDelta: mappableVenues.length === 1 ? 0.05 : 5,
      longitudeDelta: mappableVenues.length === 1 ? 0.05 : 8,
    };
  }, [mappableVenues, userLocation]);

  // If MapView is not available (web platform), return a fallback
  if (!MapView || !Marker) {
    return (
      <View style={styles.mapContainer}>
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackText}>Map not available on this platform</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mapContainer}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        customMapStyle={mapStyle}
        minZoomLevel={10}
        maxZoomLevel={19}
        showsUserLocation={false}
      >
        {/* Custom user location marker */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <UserLocationMarker />
          </Marker>
        )}

        {mappableVenues.map((venue) => (
          <VenueMarker
            key={venue.id}
            venue={venue}
            onMarkerPress={onMarkerPress}
            getMarkerColor={getMarkerColor}
          />
        ))}
      </MapView>
      
      {/* Legend for native map */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Crowd Level</Text>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#6BCF7F' }]} />
          <Text style={styles.legendText}>{'<50 people'}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FFD93D' }]} />
          <Text style={styles.legendText}>50-99 people</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
          <Text style={styles.legendText}>100+ people</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  fallbackText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  markerOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  customMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.9)',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  markerCount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  userLocationWrapper: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userLocationRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 75, 75, 0.35)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 75, 75, 0.5)',
  },
  userLocationDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'red', // Change the color to red
    justifyContent: 'center',
    alignItems: 'center',
  },
  legend: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.sm,
  },
  legendText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  venueCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 0, 0, 0.5)', // Semi-transparent red circle
    position: 'absolute',
  },
});