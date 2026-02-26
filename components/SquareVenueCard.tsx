import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Users, MapPin, Star, Clock, Shield } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { Venue } from '@/types/models';
import * as Haptics from 'expo-haptics';

interface SquareVenueCardProps {
  venue: Venue;
  onPress: () => void;
}

export const SquareVenueCard: React.FC<SquareVenueCardProps> = ({ venue, onPress }) => {
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

  const getOpenStatus = () => {
    if (!venue.hours) return { status: 'Closed', color: theme.colors.text.tertiary };
    
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const dayHours = venue.hours[currentDay];
    if (!dayHours) return { status: 'Closed', color: theme.colors.text.tertiary };
    
    const openTime = parseInt(dayHours.open.replace(':', ''));
    const closeTime = parseInt(dayHours.close.replace(':', ''));
    
    let isOpen = false;
    if (closeTime < openTime) {
      // Venue closes after midnight
      isOpen = currentTime >= openTime || currentTime <= closeTime;
    } else {
      isOpen = currentTime >= openTime && currentTime <= closeTime;
    }
    
    if (isOpen) {
      // Check if closing soon (within 1 hour)
      let timeUntilClose = 0;
      if (closeTime < openTime) {
        // Closes after midnight
        if (currentTime >= openTime) {
          timeUntilClose = (2400 - currentTime) + closeTime;
        } else {
          timeUntilClose = closeTime - currentTime;
        }
      } else {
        timeUntilClose = closeTime - currentTime;
      }
      
      if (timeUntilClose <= 100) { // Within 1 hour
        return { status: 'Closing Soon', color: theme.colors.warning };
      }
      return { status: 'Open', color: theme.colors.success };
    }
    
    return { status: 'Closed', color: theme.colors.text.tertiary };
  };

  const getClosingTime = () => {
    if (!venue.hours) return '';
    
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
    const dayHours = venue.hours[currentDay];
    
    if (!dayHours) return 'Closed today';
    
    const closeTime = dayHours.close;
    const [hours, minutes] = closeTime.split(':');
    const hour24 = parseInt(hours);
    
    if (hour24 === 0) return 'Closes 12:00 AM';
    if (hour24 < 12) return `Closes ${hour24}:${minutes} AM`;
    if (hour24 === 12) return `Closes 12:${minutes} PM`;
    return `Closes ${hour24 - 12}:${minutes} PM`;
  };

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const capacityStatus = getCapacityStatus();
  const openStatus = getOpenStatus();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.95}
      testID="square-venue-card"
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: (venue.photos?.[0] && venue.photos[0].trim() !== '') ? venue.photos[0] : 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800' }} style={styles.image} />
        <View style={[styles.statusBadge, { backgroundColor: capacityStatus.color }]}>
          <Text style={styles.statusText}>{capacityStatus.status}</Text>
        </View>
      </View>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{venue.name}</Text>
          <View style={styles.ratingContainer}>
            <Star size={12} color={theme.colors.warning} fill={theme.colors.warning} />
            <Text style={styles.rating}>{venue.rating}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <MapPin size={12} color={theme.colors.text.tertiary} />
            <Text style={styles.infoText}>{venue.distance != null ? Math.round(venue.distance) : '—'} mi</Text>
          </View>
          <View style={styles.infoItem}>
            <Clock size={12} color={openStatus.color} />
            <Text style={[styles.infoText, { color: openStatus.color }]}>{openStatus.status}</Text>
          </View>
        </View>

        <View style={styles.crowdRow}>
          <Users size={12} color={capacityStatus.color} />
          <Text style={[styles.crowdText, { color: capacityStatus.color }]}>
            {venue.currentCount || 0}/{venue.maxCapacity || venue.capacity} inside
          </Text>
        </View>

        <Text style={styles.hoursText} numberOfLines={1}>{getClosingTime()}</Text>
        
        <View style={styles.ageRow}>
          <Shield size={12} color={theme.colors.text.tertiary} />
          <Text style={styles.ageText}>{venue.minEntryAge} Entry</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 160,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginRight: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 120,
    backgroundColor: theme.colors.cardElevated,
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    padding: 12,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rating: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
  },
  crowdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  crowdText: {
    fontSize: 12,
    fontWeight: '600',
  },
  hoursText: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
    fontWeight: '500',
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ageText: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
    fontWeight: '500',
  },
});