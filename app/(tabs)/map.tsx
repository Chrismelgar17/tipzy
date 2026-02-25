import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { MapPin, Users, Clock, X, Heart } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { router } from 'expo-router';
import { Venue } from '@/types/models';
import { useAuth } from '@/hooks/auth-context';
import { useVenues } from '@/hooks/venues-context';
import * as Location from 'expo-location';

// Import NativeMapView - Metro will automatically choose the right platform file
import NativeMapView from '@/components/NativeMapView';
import { distanceMiles } from '@/utils/distance';

const { height } = Dimensions.get('window');

const MAX_RADIUS_MILES = 25;



export default function MapScreen() {
  const { user, updateProfile } = useAuth();
  const { venues } = useVenues();
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showInfoCard, setShowInfoCard] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<string[]>(user?.favorites || []);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    })();
  }, []);

  const handleMarkerPress = (venue: Venue) => {
    setSelectedVenue(venue);
    setShowInfoCard(true);
  };

  const handleInfoCardPress = () => {
    setShowInfoCard(false);
    setShowModal(true);
  };

  const handleVenuePress = (venueId: string) => {
    setShowModal(false);
    router.push(`/venue/${venueId}` as any);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedVenue(null);
  };

  const closeInfoCard = () => {
    setShowInfoCard(false);
    setSelectedVenue(null);
  };

  const toggleFavorite = (venueId: string) => {
    const isFavorite = favorites.includes(venueId);
    let updatedFavorites: string[];
    
    if (isFavorite) {
      updatedFavorites = favorites.filter(id => id !== venueId);
    } else {
      updatedFavorites = [...favorites, venueId];
    }
    
    setFavorites(updatedFavorites);
    if (user) {
      updateProfile({ favorites: updatedFavorites });
    }
    
    Alert.alert(
      isFavorite ? 'Removed from Favorites' : 'Added to Favorites',
      isFavorite ? 'Venue removed from your favorites' : 'Venue added to your favorites'
    );
  };



  const getMarkerColor = (crowdCount: number) => {
    if (crowdCount >= 100) return '#FF6B6B';
    if (crowdCount >= 50) return '#FFD93D';
    return '#6BCF7F';
  };

  const getCrowdLabel = (crowdCount: number) => {
    if (crowdCount >= 100) return 'Packed';
    if (crowdCount >= 50) return 'Busy';
    return 'Not Crowded';
  };

  // Only show venues within MAX_RADIUS_MILES of the user.
  // Fall back to all venues if location permission was denied.
  const nearbyVenues = userLocation
    ? venues.filter(
        (v) =>
          v.geo &&
          distanceMiles(
            userLocation.latitude,
            userLocation.longitude,
            v.geo.lat,
            v.geo.lng,
          ) <= MAX_RADIUS_MILES,
      )
    : venues;

  const renderMapView = () => {
    return (
      <NativeMapView
        venues={nearbyVenues}
        onMarkerPress={handleMarkerPress}
        getMarkerColor={getMarkerColor}
        userLocation={userLocation}
      />
    );
  };



  return (
    <View style={styles.container}>
      {renderMapView()}

      {/* Info Card - appears when pin is tapped */}
      {showInfoCard && selectedVenue && (
        <View style={styles.infoCardContainer}>
          <TouchableOpacity 
            style={styles.infoCard}
            onPress={handleInfoCardPress}
            activeOpacity={0.9}
          >
            <TouchableOpacity 
              style={styles.infoCardClose}
              onPress={closeInfoCard}
            >
              <X size={16} color={theme.colors.text.secondary} />
            </TouchableOpacity>
            
            <Image 
              source={{ uri: selectedVenue.photos?.[0] || 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800' }} 
              style={styles.infoCardImage} 
            />
            
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardTitle}>{selectedVenue.name}</Text>
              <Text style={styles.infoCardAddress}>{selectedVenue.address}</Text>
              
              <View style={styles.infoCardStats}>
                <View style={styles.infoCardStat}>
                  <Users size={14} color={theme.colors.text.secondary} />
                  <Text style={styles.infoCardStatText}>{selectedVenue.crowdCount} people</Text>
                </View>
                <View style={styles.infoCardStat}>
                  <Clock size={14} color={theme.colors.text.secondary} />
                  <Text style={styles.infoCardStatText}>{selectedVenue.closingTime}</Text>
                </View>
              </View>
              
              <View style={styles.infoCardCrowd}>
                <View 
                  style={[
                    styles.infoCardCrowdDot, 
                    { backgroundColor: getMarkerColor(selectedVenue.crowdCount) }
                  ]} 
                />
                <Text style={styles.infoCardCrowdText}>
                  {getCrowdLabel(selectedVenue.crowdCount)}
                </Text>
              </View>
              
              <Text style={styles.infoCardTap}>Tap for details</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Full Details Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedVenue && (
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                    <X size={24} color={theme.colors.text.primary} />
                  </TouchableOpacity>
                </View>
                
                <Image 
                  source={{ uri: selectedVenue.photos?.[0] || 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800' }} 
                  style={styles.modalImage} 
                />
                
                <View style={styles.modalInfo}>
                  <Text style={styles.modalTitle}>{selectedVenue.name}</Text>
                  <Text style={styles.modalAddress}>{selectedVenue.address}</Text>
                  
                  <View style={styles.modalStats}>
                    <View style={styles.statItem}>
                      <Users size={16} color={theme.colors.text.secondary} />
                      <Text style={styles.statText}>{selectedVenue.crowdCount} people inside</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Clock size={16} color={theme.colors.text.secondary} />
                      <Text style={styles.statText}>Closes {selectedVenue.closingTime}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <MapPin size={16} color={theme.colors.text.secondary} />
                      <Text style={styles.statText}>{selectedVenue.distance} mi away</Text>
                    </View>
                  </View>
                  
                  <View style={styles.crowdIndicator}>
                    <View 
                      style={[
                        styles.crowdDot, 
                        { backgroundColor: getMarkerColor(selectedVenue.crowdCount) }
                      ]} 
                    />
                    <Text style={styles.crowdText}>
                      {getCrowdLabel(selectedVenue.crowdCount)}
                    </Text>
                  </View>
                  
                  <Text style={styles.modalDescription}>
                    {selectedVenue.genres.join(' • ')} • {selectedVenue.dressCode} dress code
                  </Text>
                  
                  <View style={styles.modalButtons}>
                    <TouchableOpacity 
                      style={[styles.favoriteButton, favorites.includes(selectedVenue.id) && styles.favoriteButtonActive]}
                      onPress={() => toggleFavorite(selectedVenue.id)}
                    >
                      <Heart 
                        size={16} 
                        color={favorites.includes(selectedVenue.id) ? theme.colors.white : theme.colors.text.primary}
                        fill={favorites.includes(selectedVenue.id) ? theme.colors.white : 'none'}
                      />
                      <Text style={[styles.favoriteButtonText, favorites.includes(selectedVenue.id) && styles.favoriteButtonTextActive]}>
                        {favorites.includes(selectedVenue.id) ? 'Remove from Favorites' : 'Add to Favorites'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.detailsButton}
                      onPress={() => handleVenuePress(selectedVenue.id)}
                    >
                      <Text style={styles.detailsButtonText}>View Full Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Map Styles
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  customMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  // Web placeholder styles
  webPlaceholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  webPlaceholder: {
    width: '100%',
    maxWidth: 400,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  placeholderIcon: {
    marginBottom: theme.spacing.lg,
    opacity: 0.7,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  placeholderSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.xl,
  },
  venueListFallback: {
    width: '100%',
    marginTop: theme.spacing.lg,
  },
  venueListTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  venueItem: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  venueAddress: {
    fontSize: 14,
    marginBottom: theme.spacing.sm,
  },
  venueCrowd: {
    flexDirection: 'row',
    alignItems: 'center',
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

  // Info Card Styles
  infoCardContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
  },
  infoCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  infoCardClose: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 4,
  },
  infoCardImage: {
    width: '100%',
    height: 120,
  },
  infoCardContent: {
    padding: theme.spacing.md,
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  infoCardAddress: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  infoCardStats: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  infoCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCardStatText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginLeft: 4,
  },
  infoCardCrowd: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  infoCardCrowdDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.xs,
  },
  infoCardCrowdText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  infoCardTap: {
    fontSize: 12,
    color: theme.colors.purple,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: theme.spacing.md,
    paddingBottom: 0,
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  modalImage: {
    width: '100%',
    height: 200,
  },
  modalInfo: {
    padding: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  modalAddress: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
  },
  modalStats: {
    marginBottom: theme.spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.sm,
  },
  crowdIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  crowdDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.sm,
  },
  crowdText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  modalDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  favoriteButtonText: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  favoriteButtonActive: {
    backgroundColor: theme.colors.error,
  },
  favoriteButtonTextActive: {
    color: theme.colors.white,
  },
  detailsButton: {
    flex: 1,
    backgroundColor: theme.colors.purple,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});