import React, { useMemo, useEffect, useRef, useState, Component } from 'react';
import { View, Text, StyleSheet, Platform, Animated, Easing } from 'react-native';

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
import { Svg, Path, Line, Circle as SvgCircle, Defs, LinearGradient, Stop } from 'react-native-svg';
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
      {/* Pulsing ring — white */}
      <Animated.View
        style={[
          styles.userLocationRing,
          { transform: [{ scale: ringScale }], opacity: ringOpacity },
        ]}
      />
      {/* Circular dark badge */}
      <View style={styles.userLocationDot}>
        {/* Tipzy martini glass — white with gradient shimmer */}
        <Svg width={28} height={32} viewBox="0 0 64 72">
          <Defs>
            {/* Subtle top-to-bottom shimmer inside the glass bowl */}
            <LinearGradient id="bowlGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.18" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.04" />
            </LinearGradient>
            {/* Garnish fill */}
            <LinearGradient id="garnishGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.22" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.06" />
            </LinearGradient>
          </Defs>
          {/* Glass bowl filled with gradient shimmer */}
          <Path
            d="M 4,16 L 60,16 L 32,50 Z"
            fill="url(#bowlGrad)"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Stem */}
          <Line x1="32" y1="50" x2="32" y2="62" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
          {/* Base */}
          <Line x1="19" y1="62" x2="45" y2="62" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
          {/* Straw (diagonal, upper-left) */}
          <Line x1="23" y1="16" x2="11" y2="4" stroke="rgba(255,255,255,0.75)" strokeWidth="3" strokeLinecap="round" />
          {/* Citrus garnish — circle on right rim */}
          <SvgCircle cx="57" cy="10" r="9" fill="url(#garnishGrad)" stroke="#FFFFFF" strokeWidth="2.5" />
          {/* Citrus segments */}
          <Line x1="48" y1="10" x2="66" y2="10" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
          <Line x1="57" y1="1" x2="57" y2="19" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
        </Svg>
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
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userLocationRing: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  userLocationDot: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(10, 6, 20, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
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