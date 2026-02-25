import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, MapPin, Star, Clock, Search } from 'lucide-react-native';
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
}

const MAX_RADIUS_MILES = 25;
type SortOption = 'busiest' | 'nearby' | 'top-rated' | 'open-now';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { showSignInModal, setShowSignInModal, signInPrompt } = useAuth();
  const [selectedSort, setSelectedSort] = useState<SortOption>('nearby');

  const { venues, isLoading: venuesLoading } = useVenues();
  const [searchQuery, setSearchQuery] = useState('');
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

  // Only show venues within MAX_RADIUS_MILES. Fall back to all if location unavailable.
  const nearbyVenues = useMemo(() => {
    if (!userLocation) return venues;
    return venues.filter(
      (v) => {
        // Include venues with no geo data so they're never hidden
        if (!v.geo || (v.geo.lat === 0 && v.geo.lng === 0)) return true;
        return distanceMiles(
          userLocation.latitude,
          userLocation.longitude,
          v.geo.lat,
          v.geo.lng,
        ) <= MAX_RADIUS_MILES;
      }
    );
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
    return nearbyVenues
      .filter(venue => venue.featuredRank && venue.featuredRank <= 3)
      .sort((a, b) => (a.featuredRank || 0) - (b.featuredRank || 0));
  };

  const getPlacesYoullLike = () => {
    return nearbyVenues
      .filter(venue => (venue.rating || 0) >= 4.2)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6);
  };

  const getMostViewed = () => {
    return [...nearbyVenues]
      .sort((a, b) => {
        const scoreA = (a.currentCount || 0) * 0.6 + (a.rating || 0) * 0.4;
        const scoreB = (b.currentCount || 0) * 0.6 + (b.rating || 0) * 0.4;
        return scoreB - scoreA;
      })
      .slice(0, 6);
  };

  const getRecentlyViewed = () => {
    return nearbyVenues.slice(2, 5);
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

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top + 16 }]}>
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
      >
        {/* Loading indicator while fetching real venues */}
        {venuesLoading && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color={theme.colors.purple} />
            <Text style={styles.loadingText}>Loading venues…</Text>
          </View>
        )}

        {/* Featured Offers Section */}
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
                  onPress={() => handleOfferPress(offer.id)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Featured on Tipzy Section */}
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

        {/* Places You'll Like Section */}
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

        {/* Most Viewed Section */}
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

        {/* Recently Viewed Section */}
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

        {/* All Venues (Filtered/Sorted) Section */}
        {(searchQuery.trim() || selectedSort !== 'nearby') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {searchQuery.trim() ? 'Search Results' : 
               selectedSort === 'busiest' ? 'Busiest Right Now' :
               selectedSort === 'top-rated' ? 'Top Rated' :
               selectedSort === 'open-now' ? 'Open Now' : 'All Venues'}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.venuesContainer}
            >
              {getSortedVenues().map((venue) => (
                <SquareVenueCard
                  key={venue.id}
                  venue={venue}
                  onPress={() => handleVenuePress(venue.id)}
                />
              ))}
            </ScrollView>
          </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardElevated,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
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