import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  MapPin,
  Clock,
  Users,
  Music,
  Heart,
  Share2,

} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { mockVenues, mockEvents } from '@/mocks/venues';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/hooks/auth-context';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user, toggleFavorite } = useAuth();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const venue = mockVenues.find(v => v.id === id);
  const events = mockEvents.filter(e => e.venueId === id);
  const isFavorite = user?.favorites.includes(id as string);

  if (!venue) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Venue not found</Text>
      </SafeAreaView>
    );
  }

  const handleClose = () => {
    router.back();
  };

  const handleFavorite = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    toggleFavorite(venue.id);
  };

  const handleBuyTicket = (eventId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push({
      pathname: '/checkout' as any,
      params: { eventId },
    });
  };

  const getCrowdColor = () => {
    switch (venue.crowdLevel) {
      case 'quiet': return theme.colors.success;
      case 'moderate': return theme.colors.cyan;
      case 'busy': return theme.colors.warning;
      case 'packed': return theme.colors.error;
      default: return theme.colors.gray[500];
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: (venue.photos?.[selectedImageIndex] && venue.photos[selectedImageIndex].trim() !== '') ? venue.photos[selectedImageIndex] : 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800' }}
            style={styles.mainImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.imageOverlay}
          />
          
          {/* Header Actions */}
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleClose}>
              <X size={24} color={theme.colors.white} />
            </TouchableOpacity>
            <View style={styles.rightActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleFavorite}>
                <Heart
                  size={24}
                  color={theme.colors.white}
                  fill={isFavorite ? theme.colors.error : 'transparent'}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Share2 size={24} color={theme.colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Venue Title Overlay */}
          <View style={styles.titleOverlay}>
            <Text style={styles.venueName}>{venue.name}</Text>
            <View style={styles.venueStats}>
              <View style={[styles.crowdBadge, { backgroundColor: getCrowdColor() }]}>
                <Users size={14} color={theme.colors.white} />
                <Text style={styles.crowdText}>{venue.crowdCount} inside</Text>
              </View>
              <View style={styles.priceBadge}>
                <Text style={styles.priceText}>{'$'.repeat(venue.priceLevel)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Image Thumbnails */}
        {venue.photos.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailContainer}
          >
            {venue.photos.map((photo, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedImageIndex(index)}
              >
                <Image
                  source={{ uri: (photo && photo.trim() !== '') ? photo : 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800' }}
                  style={[
                    styles.thumbnail,
                    selectedImageIndex === index && styles.thumbnailActive,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Venue Info */}
        <View style={styles.content}>
          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <MapPin size={20} color={theme.colors.text.secondary} />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{venue.address}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Clock size={20} color={theme.colors.text.secondary} />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Tonight&apos;s Hours</Text>
                <Text style={styles.infoValue}>Open until {venue.closingTime}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Music size={20} color={theme.colors.text.secondary} />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Music</Text>
                <Text style={styles.infoValue}>{venue.genres.join(', ')}</Text>
              </View>
            </View>
          </View>

          {/* Dress Code & Age */}
          <View style={styles.policies}>
            <View style={styles.policyItem}>
              <Text style={styles.policyLabel}>Dress Code</Text>
              <Text style={styles.policyValue}>{venue.dressCode}</Text>
            </View>
            <View style={styles.policyItem}>
              <Text style={styles.policyLabel}>Entry Age</Text>
              <Text style={styles.policyValue}>{venue.minEntryAge || venue.minAge + '+'}</Text>
            </View>
            <View style={styles.policyItem}>
              <Text style={styles.policyLabel}>Capacity</Text>
              <Text style={styles.policyValue}>{venue.capacity}</Text>
            </View>
          </View>

          {/* Events */}
          <View style={styles.eventsSection}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            {events.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <Image source={{ uri: (event.images?.[0] && event.images[0].trim() !== '') ? event.images[0] : 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800' }} style={styles.eventImage} />
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventDate}>
                    {new Date(event.startAt).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  {event.friendsGoing && event.friendsGoing > 0 && (
                    <Text style={styles.friendsGoing}>
                      {event.friendsGoing} friends going
                    </Text>
                  )}
                  
                  {/* Products */}
                  <View style={styles.products}>
                    {event.products.map((product) => (
                      <TouchableOpacity
                        key={product.id}
                        style={styles.productItem}
                        onPress={() => handleBuyTicket(event.id)}
                      >
                        <View style={styles.productInfo}>
                          <Text style={styles.productName}>{product.name}</Text>
                          <Text style={styles.productPrice}>${product.price}</Text>
                        </View>
                        {product.qtySold >= product.qtyTotal * 0.8 && (
                          <View style={styles.limitedBadge}>
                            <Text style={styles.limitedText}>Limited</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  imageContainer: {
    height: height * 0.4,
    position: 'relative',
  },
  mainImage: {
    width: width,
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  headerActions: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
    right: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rightActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleOverlay: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
  },
  venueName: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.white,
    marginBottom: theme.spacing.sm,
  },
  venueStats: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  crowdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    gap: 6,
  },
  crowdText: {
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
  thumbnailContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  thumbnail: {
    width: 80,
    height: 60,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
    opacity: 0.7,
  },
  thumbnailActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: theme.colors.purple,
  },
  content: {
    padding: theme.spacing.lg,
  },
  infoSection: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  infoItem: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  policies: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  policyItem: {
    flex: 1,
    alignItems: 'center',
  },
  policyLabel: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginBottom: 4,
  },
  policyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  eventsSection: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  eventCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  eventImage: {
    width: '100%',
    height: 150,
  },
  eventInfo: {
    padding: theme.spacing.md,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  friendsGoing: {
    fontSize: 12,
    color: theme.colors.cyan,
    marginBottom: theme.spacing.md,
  },
  products: {
    gap: theme.spacing.sm,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.purple,
  },
  limitedBadge: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  limitedText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  errorText: {
    color: theme.colors.text.primary,
    fontSize: 18,
    textAlign: 'center',
    marginTop: theme.spacing.xxl,
  },
});