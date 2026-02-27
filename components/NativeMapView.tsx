import React, { useMemo, useEffect, useRef, useState, Component } from 'react';
import { View, Text, StyleSheet, Platform, Animated, Easing, Image } from 'react-native';

// Error boundary so a native map crash doesn't take down the whole app
class MapErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0614' }}>
          <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center', padding: 24 }}>
            Map failed to load.{'\n'}A Google Maps API key may be required.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}
import { theme } from '@/constants/theme';
import { Venue } from '@/types/models';

// Only import react-native-maps on native platforms
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
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

// Animated pulsing ring for user location — Tipzy neon martini glass logo
function UserLocationMarker() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
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

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.55, 0.25, 0] });

  return (
    <View style={styles.userLocationWrapper}>
      {/* Pulsing neon ring */}
      <Animated.View
        style={[
          styles.userLocationRing,
          { transform: [{ scale: ringScale }], opacity: ringOpacity },
        ]}
      />
      {/* App logo clipped to circle */}
      <View style={styles.userLocationDot}>
        <Image
          source={require('../assets/images/icon.png')}
          style={styles.userLocationIcon}
          resizeMode="cover"
        />
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

export default function NativeMapView(props: NativeMapViewProps) {
  return (
    <MapErrorBoundary>
      <NativeMapViewInner {...props} />
    </MapErrorBoundary>
  );
}

function NativeMapViewInner({ venues, onMarkerPress, getMarkerColor, userLocation }: NativeMapViewProps) {
  // Build list of venues that have real coordinates
  const mappableVenues = useMemo(
    () => venues.filter(v => v.geo && (v.geo.lat !== 0 || v.geo.lng !== 0)),
    [venues],
  );

  // Center on user location if available, else first venue, else US fallback
  const initialRegion = useMemo(() => {
    if (userLocation) {
      // Show roughly a 25-mile radius around the user.
      // 1° latitude ≈ 69 miles → 50 mile span (radius 25) ≈ 0.72°. Use 0.75 for padding.
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.75,
        longitudeDelta: 0.75,
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
        showsUserLocation={false}
      >
        {/* Custom user location marker */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={true}
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
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  markerCount: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  userLocationWrapper: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userLocationRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.5)',
  },
  userLocationDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.85)',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  userLocationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
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