import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  FlatList,
  Keyboard,
} from 'react-native';
import { MapPin, Search, X } from 'lucide-react-native';

// Only import react-native-maps on native platforms
let MapView: any = null;
let Marker: any = null;

if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
}

export interface PickedLocation {
  address: string;
  lat: number;
  lng: number;
}

interface LocationPickerMapProps {
  value: PickedLocation | null;
  onChange: (location: PickedLocation) => void;
  theme: any;
}

// US-only bounding box for Nominatim
const US_VIEWBOX = '-171.791110603,18.91619,-66.96466,71.3577635769';

const US_CENTER = { latitude: 39.8283, longitude: -98.5795 };
const US_INITIAL_REGION = {
  ...US_CENTER,
  latitudeDelta: 40,
  longitudeDelta: 60,
};

/** Returns true only when both lat and lng are real, non-zero coordinates */
function hasCoords(loc: PickedLocation | null): boolean {
  return !!loc && (loc.lat !== 0 || loc.lng !== 0);
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function LocationPickerMap({ value, onChange, theme }: LocationPickerMapProps) {
  const [searchText, setSearchText] = useState(value?.address ?? '');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapRegion, setMapRegion] = useState(
    hasCoords(value)
      ? {
          latitude: value!.lat,
          longitude: value!.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }
      : US_INITIAL_REGION,
  );
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync search text and map region when the value prop changes externally
  // (e.g. after async load from the backend)
  useEffect(() => {
    if (!value) return;
    setSearchText(value.address);
    if (hasCoords(value)) {
      setMapRegion({
        latitude: value.lat,
        longitude: value.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  }, [value?.address, value?.lat, value?.lng]);

  const searchLocations = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsSearching(true);
    try {
      const url =
        `https://nominatim.openstreetmap.org/search` +
        `?q=${encodeURIComponent(query)}` +
        `&format=json&addressdetails=1&limit=6` +
        `&countrycodes=us` +
        `&viewbox=${US_VIEWBOX}&bounded=1`;
      const response = await fetch(url, {
        headers: { 'Accept-Language': 'en-US,en', 'User-Agent': 'TipzyApp/1.0' },
      });
      const data: NominatimResult[] = await response.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchLocations(text), 400);
  };

  const handleSuggestionSelect = (item: NominatimResult) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const address = item.display_name;
    setSearchText(address);
    setSuggestions([]);
    setShowSuggestions(false);
    Keyboard.dismiss();
    const newRegion = {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
    setMapRegion(newRegion);
    onChange({ address, lat, lng });
  };

  const handleMapPress = async (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    // Reverse geocode with Nominatim
    try {
      const url =
        `https://nominatim.openstreetmap.org/reverse` +
        `?lat=${latitude}&lon=${longitude}&format=json`;
      const response = await fetch(url, {
        headers: { 'Accept-Language': 'en-US,en', 'User-Agent': 'TipzyApp/1.0' },
      });
      const data = await response.json();
      // Reject if outside the US
      if (data?.address?.country_code && data.address.country_code !== 'us') return;
      const address = data.display_name ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      setSearchText(address);
      setMapRegion(prev => ({ ...prev, latitude, longitude }));
      onChange({ address, lat: latitude, lng: longitude });
    } catch {
      const address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      setSearchText(address);
      setMapRegion(prev => ({ ...prev, latitude, longitude }));
      onChange({ address, lat: latitude, lng: longitude });
    }
  };

  const clearLocation = () => {
    setSearchText('');
    setSuggestions([]);
    setShowSuggestions(false);
    setMapRegion(US_INITIAL_REGION);
  };

  const styles = makeStyles(theme);

  return (
    <View style={styles.container}>
      {/* ── Map ── */}
      <View style={styles.mapWrapper}>
        {MapView && Marker ? (
          <MapView
            style={styles.map}
            region={mapRegion}
            onRegionChangeComplete={setMapRegion}
            onPress={handleMapPress}
            showsUserLocation={false}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            {hasCoords(value) && (
              <Marker
                coordinate={{ latitude: value!.lat, longitude: value!.lng }}
                draggable
                onDragEnd={(e: any) => handleMapPress(e)}
              >
                <View style={styles.pinWrapper}>
                  <MapPin size={32} color={theme.colors.purple} fill={theme.colors.purple} />
                </View>
              </Marker>
            )}
          </MapView>
        ) : (
          <View style={styles.webFallback}>
            <MapPin size={32} color={theme.colors.purple} />
            <Text style={styles.webFallbackText}>
              Map available on the mobile app.
            </Text>
            <Text style={styles.webFallbackSub}>
              Use the search below to set your location.
            </Text>
          </View>
        )}

        {/* Tap-to-place hint (only if no real pin yet) */}
        {!hasCoords(value) && MapView && (
          <View style={styles.tapHint} pointerEvents="none">
            <Text style={styles.tapHintText}>Tap the map to place your venue pin</Text>
          </View>
        )}
      </View>

      {/* ── Search ── */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <Search size={18} color={theme.colors.text.secondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={handleSearchChange}
            placeholder="Search address, city, or zip code…"
            placeholderTextColor={theme.colors.text.secondary}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => searchLocations(searchText)}
          />
          {isSearching && (
            <ActivityIndicator size="small" color={theme.colors.purple} style={styles.spinner} />
          )}
          {searchText.length > 0 && !isSearching && (
            <TouchableOpacity onPress={clearLocation} style={styles.clearBtn}>
              <X size={16} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>

        {showSuggestions && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={suggestions}
              keyExtractor={(item) => String(item.place_id)}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={false}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    styles.suggestionItem,
                    index < suggestions.length - 1 && styles.suggestionBorder,
                  ]}
                  onPress={() => handleSuggestionSelect(item)}
                  activeOpacity={0.7}
                >
                  <MapPin size={14} color={theme.colors.purple} style={styles.suggestionPin} />
                  <Text style={styles.suggestionText} numberOfLines={2}>
                    {item.display_name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {value && (
          <View style={styles.selectedRow}>
            <MapPin size={14} color={theme.colors.purple} />
            <Text style={styles.selectedText} numberOfLines={2}>
              {value.address}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    container: {
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    mapWrapper: {
      height: 220,
      backgroundColor: theme.colors.background,
    },
    map: {
      flex: 1,
    },
    webFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 16,
    },
    webFallbackText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
    webFallbackSub: {
      fontSize: 12,
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
    pinWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    tapHint: {
      position: 'absolute',
      bottom: 10,
      alignSelf: 'center',
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    tapHintText: {
      color: '#fff',
      fontSize: 12,
    },
    searchContainer: {
      padding: 12,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      height: 46,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.text.primary,
    },
    spinner: {
      marginLeft: 6,
    },
    clearBtn: {
      padding: 4,
      marginLeft: 4,
    },
    suggestionsContainer: {
      marginTop: 4,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      overflow: 'hidden',
    },
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    suggestionBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    suggestionPin: {
      marginRight: 8,
      marginTop: 2,
      flexShrink: 0,
    },
    suggestionText: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.text.primary,
      lineHeight: 20,
    },
    selectedRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 10,
      gap: 6,
    },
    selectedText: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.text.secondary,
      lineHeight: 18,
    },
  });
}
