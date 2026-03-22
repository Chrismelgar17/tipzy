import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, MapPin, Star, Clock, Search, RefreshCw } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { SquareVenueCard } from '@/components/SquareVenueCard';
import { OfferCard } from '@/components/OfferCard';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/auth-context';
import { useVenues } from '@/hooks/venues-context';
import { SignInModal } from '@/components/SignInModal';
import * as Location from 'expo-location';
import { distanceMiles } from '@/utils/distance';
import { Venue } from '@/types/models';
import api from '@/lib/api';

interface ApiOffer {
  id: string;
  venueId: string;
  venueName: string;
  title: string;
  description: string;
  discount: number;
  image: string;
  validUntil: string | null;
  isActive: boolean;
  isSponsored?: boolean;
}

type SortOption = 'busiest' | 'nearby' | 'top-rated' | 'open-now';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { showSignInModal, setShowSignInModal, signInPrompt } = useAuth();
  const [selectedSort, setSelectedSort] = useState<SortOption>('nearby');

  const { venues, isLoading: venuesLoading, refresh: refreshVenues } = useVenues();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [offers, setOffers] = useState<ApiOffer[]>([]);

  // Request location once on mount so we can filter venues by proximity
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    })();
  }, []);

  // Fetch real offers from the backend
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/venues/offers');
        setOffers(res.data?.offers ?? []);
      } catch (err) {
        console.warn('[HomeScreen] Could not load offers:', err);
      }
    })();
  }, []);

  // Enrich venues with distance when location is known, but never filter any out
  const nearbyVenues = useMemo(() => {
    if (!userLocation) return venues;
    return venues.map((v) => {
      if (!v.geo || (v.geo.lat === 0 && v.geo.lng === 0)) return v;
      return {
        ...v,
        distance: distanceMiles(
          userLocation.latitude,
          userLocation.longitude,
          v.geo.lat,
          v.geo.lng,
        ),
      };
    });
  }, [venues, userLocation]);

  const sortOptions: { key: SortOption; label: string; icon: any }[] = [
    { key: 'busiest', label: 'Busiest', icon: Users },
    { key: 'nearby', label: 'Nearby', icon: MapPin },
    { key: 'top-rated', label: 'Top Rated', icon: Star },
    { key: 'open-now', label: 'Open Now', icon: Clock },
  ];

  const handleSortChange = (sort: SortOption) => {
    if (!sort || typeof sort !== 'string' || sort.length > 20) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedSort(sort);
  };

  const handleVenuePress = (venueId: string) => {
    if (!venueId || typeof venueId !== 'string' || venueId.length > 50) {
      console.warn('Invalid venue ID:', venueId);
      return;
    }
    router.push(`/venue/${venueId}`);
  };





  const isVenueOpenNow = (venue: Venue) => {
    if (!venue || !venue.hours || !venue.name || venue.name.length > 100) return false;
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const dayHours = venue.hours[currentDay];
    if (!dayHours) return false;
    
    const openTime = parseInt(dayHours.open.replace(':', ''));
    const closeTime = parseInt(dayHours.close.replace(':', ''));
    
    // Handle venues that close after midnight
    if (closeTime < openTime) {
      return currentTime >= openTime || currentTime <= closeTime;
    }
    
    return currentTime >= openTime && currentTime <= closeTime;
  };

  const getSortedVenues = () => {
    let sorted = [...nearbyVenues];
    
    // Filter by search query first
    if (searchQuery.trim()) {
      sorted = sorted.filter(venue => 
        venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        venue.genres.some(genre => genre.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    switch (selectedSort) {
      case 'busiest':
        return sorted.sort((a, b) => (b.currentCount || 0) - (a.currentCount || 0));
      case 'nearby':
        return sorted.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      case 'top-rated':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'open-now':
        return sorted.filter(venue => isVenueOpenNow(venue)).sort((a, b) => (a.distance || 0) - (b.distance || 0));
      default:
        return sorted;
    }
  };

  // Get different venue sections
  const getFeaturedVenues = () => {
    const featured = nearbyVenues
      .filter(venue => venue.featuredRank && venue.featuredRank > 0)
      .sort((a, b) => (a.featuredRank || 0) - (b.featuredRank || 0));
    // Fall back to first 6 venues sorted by distance
    if (featured.length === 0) {
      return [...nearbyVenues]
        .sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999))
        .slice(0, 6);
    }
    return featured.slice(0, 6);
  };

  const getNearestVenues = () => {
    return [...nearbyVenues]
      .filter(v => v.distance != null)
      .sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999))
      .slice(0, 8);
  };

  const getPlacesYoullLike = () => {
    // Show top-rated venues closest first; if none have ratings show highest crowd count
    const rated = nearbyVenues.filter(v => (v.rating ?? 0) > 0);
    if (rated.length > 0) {
      return rated
        .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (a.distance ?? 9999) - (b.distance ?? 9999))
        .slice(0, 6);
    }
    return [...nearbyVenues]
      .sort((a, b) => (b.currentCount || 0) - (a.currentCount || 0) || (a.distance ?? 9999) - (b.distance ?? 9999))
      .slice(0, 6);
  };

  const getMostViewed = () => {
    return [...nearbyVenues]
      .sort((a, b) => {
        const scoreA = (a.currentCount || 0) * 0.6 + (a.rating || 0) * 0.4;
        const scoreB = (b.currentCount || 0) * 0.6 + (b.rating || 0) * 0.4;
        return scoreB - scoreA || (a.distance ?? 9999) - (b.distance ?? 9999);
      })
      .slice(0, 6);
  };

  const getRecentlyViewed = () => {
    return [...nearbyVenues]
      .sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
        (a.distance ?? 9999) - (b.distance ?? 9999),
      )
      .slice(0, 5);
  };

  const handleOfferPress = (offerId: string) => {
    if (!offerId || typeof offerId !== 'string' || offerId.length > 50) {
      console.warn('Invalid offer ID:', offerId);
      return;
    }
    const offer = offers.find(o => o.id === offerId);
    if (offer && offer.venueId) {
      router.push(`/venue/${offer.venueId}`);
    } else {
      console.warn('Offer not found or missing venue ID:', offerId);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshVenues(),
        api.get('/venues/offers').then(res => setOffers(res.data?.offers ?? [])).catch(() => {}),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshVenues]);

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top + 16 }]}>
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Search size={20} color={theme.colors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search bars, clubs, or events..."
              placeholderTextColor={theme.colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing
              ? <ActivityIndicator size="small" color={theme.colors.purple} />
              : <RefreshCw size={20} color={theme.colors.text.secondary} />}
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {sortOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedSort === option.key;
            
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.filterButton, isSelected && styles.filterButtonActive]}
                onPress={() => handleSortChange(option.key)}
              >
                <Icon
                  size={16}
                  color={isSelected ? theme.colors.white : theme.colors.text.secondary}
                />
                <Text
                  style={[styles.filterButtonText, isSelected && styles.filterButtonTextActive]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.purple}
            colors={[theme.colors.purple]}
          />
        }
      >
        {/* Loading indicator while fetching real venues */}
        {venuesLoading && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color={theme.colors.purple} />
            <Text style={styles.loadingText}>Loading venues…</Text>
          </View>
        )}

        {/* ── SEARCH / FILTER RESULTS ── replaces all sections when active */}
        {searchQuery.trim() || selectedSort !== 'nearby' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {searchQuery.trim()
                ? getSortedVenues().length === 0
                  ? 'No results found'
                  : `${getSortedVenues().length} result${getSortedVenues().length === 1 ? '' : 's'} for "${searchQuery}"`
                : selectedSort === 'busiest' ? 'Busiest Right Now'
                : selectedSort === 'top-rated' ? 'Top Rated'
                : selectedSort === 'open-now' ? 'Open Now'
                : 'All Venues'}
            </Text>
            {getSortedVenues().length === 0 ? (
              <Text style={styles.noResultsText}>
                {searchQuery.trim() ? 'Try a different name or genre.' : 'No venues found for this filter.'}
              </Text>
            ) : (
              <View style={styles.searchGrid}>
                {getSortedVenues().map((venue) => (
                  <View key={venue.id} style={styles.searchGridItem}>
                    <SquareVenueCard
                      venue={venue}
                      onPress={() => handleVenuePress(venue.id)}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <>
            {/* Nearest to You – always first when location is known */}
            {getNearestVenues().length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { marginHorizontal: 0, marginBottom: 0 }]}>Nearest to You</Text>
                  {userLocation && (
                    <View style={styles.locationBadge}>
                      <MapPin size={12} color={theme.colors.purple} />
                      <Text style={styles.locationBadgeText}>By distance</Text>
                    </View>
                  )}
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.venuesContainer}
                >
                  {getNearestVenues().map((venue) => (
                    <SquareVenueCard
                      key={venue.id}
                      venue={venue}
                      onPress={() => handleVenuePress(venue.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Featured Offers Section */}}
            {offers.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Featured Offers</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.offersContainer}
                >
                  {offers.map((offer) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer as any}
                      isSponsored={offer.isSponsored}
                      onPress={() => handleOfferPress(offer.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Featured on Tipzy Section */}
            {getFeaturedVenues().length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Featured on Tipzy</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.venuesContainer}
                >
                  {getFeaturedVenues().map((venue) => (
                    <SquareVenueCard
                      key={venue.id}
                      venue={venue}
                      onPress={() => handleVenuePress(venue.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Places You'll Like Section */}
            {getPlacesYoullLike().length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Places You&apos;ll Like</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.venuesContainer}
                >
                  {getPlacesYoullLike().map((venue) => (
                    <SquareVenueCard
                      key={venue.id}
                      venue={venue}
                      onPress={() => handleVenuePress(venue.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Most Viewed Section */}
            {getMostViewed().length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Most Viewed</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.venuesContainer}
                >
                  {getMostViewed().map((venue) => (
                    <SquareVenueCard
                      key={venue.id}
                      venue={venue}
                      onPress={() => handleVenuePress(venue.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Recently Viewed Section */}
            {getRecentlyViewed().length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recently Viewed</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.venuesContainer}
                >
                  {getRecentlyViewed().map((venue) => (
                    <SquareVenueCard
                      key={venue.id}
                      venue={venue}
                      onPress={() => handleVenuePress(venue.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}

        {/* Business Registration Link */}
        <View style={styles.businessLinkContainer}>
          <TouchableOpacity 
            style={styles.businessLink}
            onPress={() => router.push('/onboarding/business-form')}
          >
            <Text style={styles.businessLinkText}>
              Are you a bar/club owner? Register here
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
      
      {/* Sign In Modal */}
      <SignInModal
        visible={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        title={signInPrompt}
        subtitle="Join the nightlife community"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  fixedHeader: {
    backgroundColor: theme.colors.card,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardElevated,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  refreshButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.cardElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text.primary,
    fontSize: 16,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.cardElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.purple,
    borderColor: theme.colors.purple,
  },
  filterButtonText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: theme.colors.white,
  },
  content: {
    flex: 1,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${theme.colors.purple}18`,
    borderWidth: 1,
    borderColor: `${theme.colors.purple}40`,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  locationBadgeText: {
    fontSize: 12,
    color: theme.colors.purple,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  offersContainer: {
    paddingHorizontal: 16,
  },
  venuesContainer: {
    paddingHorizontal: 16,
  },
  searchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchGridItem: {
    width: '47%',
  },
  noResultsText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    marginHorizontal: 16,
    marginTop: 8,
  },
  businessLinkContainer: {
    alignItems: 'center',
    marginTop: 32,
    marginHorizontal: 16,
  },
  businessLink: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  businessLinkText: {
    color: theme.colors.text.tertiary,
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  bottomSpacing: {
    height: 32,
  },
});