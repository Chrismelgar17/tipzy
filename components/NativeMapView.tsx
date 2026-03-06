import React, { useMemo, useEffect, useRef, useState, Component } from 'react';
import { View, Text, StyleSheet, Platform, Animated, Easing, TouchableOpacity, Image } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { Venue } from '@/types/models';

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
  // Base: near-black background for everything
  { elementType: 'geometry', stylers: [{ color: '#0d0d16' }] },
  // Turn off all labels by default — we'll selectively re-enable roads
  { elementType: 'labels', stylers: [{ visibility: 'off' }] },
  // Road fills — subtle gradient by road class
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#1c1c2e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#111120' }] },
  { featureType: 'road.local', elementType: 'geometry.fill', stylers: [{ color: '#161625' }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#1e1e30' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#241f38' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#14122a' }] },
  // Street names & numbers — visible but subtle
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#5c5c80' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#0d0d16' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  // Water — darkest layer
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#08080f' }] },
  // Landscape — matches base
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0d0d16' }] },
  // Hide all POIs (landmarks, schools, businesses, parks, etc.)
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.government', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.sports_complex', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },
];

interface NativeMapViewProps {
  venues: Venue[];
  onMarkerPress: (venue: Venue) => void;
  getMarkerColor: (crowdCount: number) => string;
  userLocation?: { latitude: number; longitude: number } | null;
}

// User location marker — Tipzy logo with neon pulsing ring
function UserLocationMarker() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.7, 0.25, 0] });

  return (
    <View style={styles.userLocationWrapper}>
      {/* Pulsing neon ring */}
      <Animated.View
        style={[
          styles.userLocationRing,
          { transform: [{ scale: ringScale }], opacity: ringOpacity },
        ]}
      />
      {/* Logo with purple glow */}
      <View style={styles.userLocationLogoShadow}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.userLocationLogo}
          resizeMode="contain"
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
        ]} />
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
  const mapRef = useRef<any>(null);

  // The first time we receive a user location, smoothly fly the camera to it.
  const hasAnimated = useRef(false);
  useEffect(() => {
    if (!userLocation || !mapRef.current || hasAnimated.current) return;
    hasAnimated.current = true;
    mapRef.current.animateToRegion(
      {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      },
      800,
    );
  }, [userLocation]);

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
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
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
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        customMapStyle={Platform.OS === 'android' ? mapStyle : undefined}
        userInterfaceStyle="dark"
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
        showsTraffic={false}
        showsIndoors={false}
        showsCompass={false}
        showsZoomControls={false}
        rotateEnabled={false}
        scrollEnabled
        zoomEnabled
        minZoomLevel={12}
        maxZoomLevel={18}
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

      {/* Recenter on user location button */}
      {userLocation && (
        <TouchableOpacity
          style={styles.recenterButton}
          onPress={() =>
            mapRef.current?.animateToRegion(
              {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              },
              600,
            )
          }
          activeOpacity={0.8}
        >
          <MapPin size={20} color="#a855f7" />
        </TouchableOpacity>
      )}

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
    backgroundColor: 'transparent',
  },
  customMarker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
  },
  userLocationWrapper: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  userLocationRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.65)',
  },
  userLocationLogoShadow: {
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 16,
    elevation: 12,
  },
  userLocationLogo: {
    width: 40,
    height: 40,
  },
  recenterButton: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(11, 11, 15, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.5)',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
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