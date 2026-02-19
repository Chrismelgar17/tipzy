import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Percent } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

interface Offer {
  id: string;
  venueId: string;
  venueName: string;
  title: string;
  description: string;
  discount: number;
  image: string;
  validUntil: Date;
  isActive: boolean;
}

interface OfferCardProps {
  offer: Offer;
  onPress: () => void;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;

export const OfferCard: React.FC<OfferCardProps> = ({ offer, onPress }) => {
  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.95}
      testID="offer-card"
    >
      <ImageBackground
        source={{ uri: (offer.image && offer.image.trim() !== '') ? offer.image : 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800' }}
        style={styles.imageBackground}
        imageStyle={styles.image}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
          style={styles.gradient}
        >
          <View style={styles.discountBadge}>
            <Percent size={16} color={theme.colors.white} />
            <Text style={styles.discountText}>{offer.discount}% OFF</Text>
          </View>
          
          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={2}>{offer.title}</Text>
            <Text style={styles.venueName} numberOfLines={1}>{offer.venueName}</Text>
            <Text style={styles.description} numberOfLines={2}>{offer.description}</Text>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: 160,
    marginRight: 16,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.card,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
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
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.purple,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  discountText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.white,
    lineHeight: 22,
  },
  venueName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  description: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    lineHeight: 16,
  },
});