import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Users, MapPin, Clock, Star } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { Venue } from '@/types/models';
import * as Haptics from 'expo-haptics';

interface CompactVenueCardProps {
  venue: Venue;
  onPress: () => void;
}



export const CompactVenueCard: React.FC<CompactVenueCardProps> = ({ venue, onPress }) => {
  const getCapacityPercentage = () => {
    if (!venue.maxCapacity || venue.maxCapacity === 0) return 0;
    return (venue.currentCount / venue.maxCapacity) * 100;
  };

  const getCapacityStatus = () => {
    const percentage = getCapacityPercentage();
    if (percentage <= 60) return { status: 'Quiet', color: theme.colors.success };
    if (percentage <= 85) return { status: 'Busy', color: theme.colors.warning };
    return { status: 'Full', color: theme.colors.error };
  };

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const capacityStatus = getCapacityStatus();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.95}
      testID="compact-venue-card"
    >
      <Image source={{ uri: (venue.photos?.[0] && venue.photos[0].trim() !== '') ? venue.photos[0] : 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800' }} style={styles.image} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{venue.name}</Text>
          <View style={styles.ratingContainer}>
            <Star size={14} color={theme.colors.warning} fill={theme.colors.warning} />
            <Text style={styles.rating}>{venue.rating}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Users size={14} color={capacityStatus.color} />
            <Text style={[styles.infoText, { color: capacityStatus.color }]}>
              {venue.currentCount || 0}/{venue.maxCapacity || venue.capacity} inside
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: capacityStatus.color }]}>
            <Text style={styles.statusText}>{capacityStatus.status}</Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.infoItem}>
            <MapPin size={14} color={theme.colors.text.tertiary} />
            <Text style={styles.detailText}>{venue.distance != null ? venue.distance.toFixed(1) : '—'} mi</Text>
          </View>
          <View style={styles.infoItem}>
            <Clock size={14} color={theme.colors.text.tertiary} />
            <Text style={styles.detailText}>Closes {venue.closingTime}</Text>
          </View>
        </View>

        <View style={styles.genresRow}>
          {venue.genres.slice(0, 2).map((genre, genreIndex) => (
            <Text key={`${venue.id}-genre-${genreIndex}`} style={styles.genreText}>
              {genre}{genreIndex < venue.genres.slice(0, 2).length - 1 ? ' • ' : ''}
            </Text>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: {
    width: 100,
    height: 100,
    backgroundColor: theme.colors.card,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailText: {
    fontSize: 13,
    color: theme.colors.text.tertiary,
  },
  genresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  genreText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
});