import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { Stack } from 'expo-router';
import { Heart, MapPin, Star, Trash2, Search, Filter, SortAsc } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/auth-context';
import { useVenues } from '@/hooks/venues-context';
import { Venue } from '@/types/models';
import { router } from 'expo-router';

export default function FavoritesScreen() {
  const { user, updateProfile } = useAuth();
  const { venues } = useVenues();
  const [favorites, setFavorites] = useState<string[]>(user?.favorites || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'distance'>('name');

  const favoriteVenues = useMemo(() => {
    let filtered = venues.filter((venue: Venue) => favorites.includes(venue.id));
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(venue => 
        venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        venue.genres.some(genre => genre.toLowerCase().includes(searchQuery.toLowerCase())) ||
        venue.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          const ratingA = 4.0 + Math.random() * 1.0;
          const ratingB = 4.0 + Math.random() * 1.0;
          return ratingB - ratingA;
        case 'distance':
          return (a.distance || 0) - (b.distance || 0);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [favorites, searchQuery, sortBy]);

  const removeFavorite = (venueId: string) => {
    Alert.alert(
      'Remove Favorite',
      'Are you sure you want to remove this venue from your favorites?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedFavorites = favorites.filter(id => id !== venueId);
            setFavorites(updatedFavorites);
            if (user) {
              updateProfile({ favorites: updatedFavorites });
            }
          },
        },
      ]
    );
  };

  const handleVenuePress = (venueId: string) => {
    router.push(`/venue/${venueId}` as any);
  };

  const renderFavoriteItem = (venue: Venue) => {
    const rating = (4.0 + Math.random() * 1.0).toFixed(1);
    const priceSymbols = '$'.repeat(venue.priceLevel);

    return (
      <TouchableOpacity
        key={venue.id}
        style={styles.favoriteItem}
        onPress={() => handleVenuePress(venue.id)}
      >
        <Image source={{ uri: venue.photos?.[0] || 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800' }} style={styles.venueImage} />
        <View style={styles.venueInfo}>
          <View style={styles.venueHeader}>
            <Text style={styles.venueName} numberOfLines={1}>
              {venue.name}
            </Text>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeFavorite(venue.id)}
            >
              <Trash2 size={18} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
          <View style={styles.venueDetails}>
            <MapPin size={14} color={theme.colors.text.secondary} />
            <Text style={styles.venueAddress} numberOfLines={1}>
              {venue.address}
            </Text>
          </View>
          <View style={styles.venueStats}>
            <View style={styles.rating}>
              <Star size={14} color={theme.colors.warning} fill={theme.colors.warning} />
              <Text style={styles.ratingText}>{rating}</Text>
            </View>
            <Text style={styles.priceLevel}>{priceSymbols}</Text>
            <Text style={styles.genres}>{venue.genres.slice(0, 2).join(', ')}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Favorites',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text.primary,
        }}
      />
      <View style={styles.container}>
        {/* Search and Sort */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={theme.colors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search favorites..."
              placeholderTextColor={theme.colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={() => {
              const nextSort = sortBy === 'name' ? 'rating' : sortBy === 'rating' ? 'distance' : 'name';
              setSortBy(nextSort);
            }}
          >
            <SortAsc size={20} color={theme.colors.purple} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {favoriteVenues.length === 0 ? (
          <View style={styles.emptyState}>
            <Heart size={64} color={theme.colors.text.tertiary} />
            <Text style={styles.emptyTitle}>You have no favorites yet</Text>
            <Text style={styles.emptyDescription}>
              Start exploring venues and tap the heart icon to save your favorites here.
            </Text>
          </View>
        ) : (
          <View style={styles.favoritesList}>
            <Text style={styles.sectionTitle}>
              {favoriteVenues.length} Favorite{favoriteVenues.length !== 1 ? 's' : ''}
            </Text>
            {favoriteVenues.map(renderFavoriteItem)}
          </View>
        )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 44,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text.primary,
    fontSize: 16,
  },
  sortButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 120,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyDescription: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  favoritesList: {
    padding: theme.spacing.lg,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  favoriteItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  venueImage: {
    width: 100,
    height: 100,
  },
  venueInfo: {
    flex: 1,
    padding: theme.spacing.md,
  },
  venueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  removeButton: {
    padding: theme.spacing.xs,
  },
  venueDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  venueAddress: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  venueStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  priceLevel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.success,
  },
  genres: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    flex: 1,
  },
});