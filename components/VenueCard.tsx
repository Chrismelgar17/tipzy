import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Users, Clock } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { Venue, crowdColorFromLevel } from '@/types/models';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Traffic-light hex values (matches CROWD_COLOR_HEX in capacity-context) */
const CROWD_HEX: Record<'green' | 'yellow' | 'red', string> = {
  green:  '#4CAF50',
  yellow: '#FF9800',
  red:    '#F44336',
};
const CROWD_LABEL: Record<'green' | 'yellow' | 'red', string> = {
  green:  'Quiet',
  yellow: 'Busy',
  red:    'Packed',
};

interface VenueCardProps {
  venue: Venue;
  onPress: () => void;
  onBuyPress: () => void;
}

const { width } = Dimensions.get('window');

export const VenueCard: React.FC<VenueCardProps> = ({ venue, onPress, onBuyPress }) => {
  // Derive crowd colour from the crowdLevel field (or pre-computed crowdColor)
  const crowdColor = venue.crowdColor ?? crowdColorFromLevel(venue.crowdLevel ?? 'quiet');
  const crowdHex   = CROWD_HEX[crowdColor];
  const crowdLabel = CROWD_LABEL[crowdColor];

  const getPriceSymbol = () => '$'.repeat(venue.priceLevel);

  const handlePress = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };
  const handleBuyPress = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onBuyPress();
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.95}
      testID="venue-card"
    >
      <ImageBackground
        source={{ uri: (venue.photos?.[0] && venue.photos[0].trim() !== '') ? venue.photos[0] : 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800' }}
        style={styles.imageBackground}
        imageStyle={styles.image}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        >
          <View style={styles.topRow}>
            {/* Traffic-light capacity badge */}
            <View style={[styles.capacityBadge, { backgroundColor: crowdHex }]}>
              <Users size={14} color={theme.colors.white} />
              <Text style={styles.capacityText}>{venue.currentCount || 0}/{venue.maxCapacity || venue.capacity}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: crowdHex }]}>
              <Text style={styles.statusText}>{crowdLabel}</Text>
            </View>
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>{getPriceSymbol()}</Text>
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={1}>{venue.name}</Text>
            
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <MapPin size={14} color={theme.colors.text.secondary} />
                <Text style={styles.infoText}>{venue.distance} mi</Text>
              </View>
              <View style={styles.infoItem}>
                <Clock size={14} color={theme.colors.text.secondary} />
                <Text style={styles.infoText}>Closes {venue.closingTime}</Text>
              </View>
            </View>

            <View style={styles.genresRow}>
              {venue.genres.slice(0, 3).map((genre, index) => (
                <View key={index} style={styles.genreTag}>
                  <Text style={styles.genreText}>{genre}</Text>
                </View>
              ))}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.detailsButton}
                onPress={handlePress}
              >
                <Text style={styles.detailsButtonText}>Details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.buyButton}
                onPress={handleBuyPress}
              >
                <LinearGradient
                  colors={[theme.colors.purple, theme.colors.purpleLight]}
                  style={styles.buyButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.buyButtonText}>Buy Access</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width - 32,
    height: 320,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.card,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  imageBackground: {
    flex: 1,
  },
  image: {
    borderRadius: theme.borderRadius.lg,
  },
  gradient: {
    flex: 1,
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    gap: 6,
  },
  capacityText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  statusText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  priceBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  priceText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.white,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
  genresRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genreTag: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  genreText: {
    color: theme.colors.white,
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  detailsButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buyButton: {
    flex: 1,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  buyButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  buyButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});