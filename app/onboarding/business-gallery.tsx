import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/hooks/theme-context';
import { useAuth } from '@/hooks/auth-context';
import { ArrowLeft, Plus, X } from 'lucide-react-native';

const MIN_PHOTOS = 2;
const MAX_PHOTOS = 5;

const { width } = Dimensions.get('window');
const imageSize = (width - 60) / 2;

// true = came from the device camera roll (not a sample)
type GalleryImage = { uri: string; isOwn: boolean };

const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1566737236500-c8ac43014a8e?w=400',
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
  'https://images.unsplash.com/photo-1574391884720-bbc2f89681ed?w=400',
  'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=400',
];

export default function BusinessGalleryScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedImages, setSelectedImages] = useState<GalleryImage[]>([]);

  if (!isLoading && !isAuthenticated) {
    router.replace('/(auth)/signin' as any);
    return null;
  }

  // Toggle a sample image on/off
  const handleSampleSelect = (imageUrl: string) => {
    const already = selectedImages.find(img => img.uri === imageUrl);
    if (already) {
      setSelectedImages(prev => prev.filter(img => img.uri !== imageUrl));
    } else if (selectedImages.length < MAX_PHOTOS) {
      setSelectedImages(prev => [...prev, { uri: imageUrl, isOwn: false }]);
    }
  };

  // Remove any image (sample or own)
  const handleRemove = (uri: string) => {
    setSelectedImages(prev => prev.filter(img => img.uri !== uri));
  };

  // Open the device image picker to add own photos
  const handleAddOwnImage = async () => {
    if (selectedImages.length >= MAX_PHOTOS) {
      Alert.alert('Limit reached', `You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library to upload images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      if (!selectedImages.find(img => img.uri === uri)) {
        setSelectedImages(prev => [...prev, { uri, isOwn: true }]);
      }
    }
  };

  const canContinue = selectedImages.length >= MIN_PHOTOS;

  const handleContinue = async () => {
    if (!canContinue) return;
    try {
      const raw = await AsyncStorage.getItem('businessProfile');
      const profile = raw ? JSON.parse(raw) : {};
      await AsyncStorage.setItem(
        'businessProfile',
        JSON.stringify({ ...profile, galleryImages: selectedImages.map(img => img.uri) })
      );
    } catch {}
    router.push('/onboarding/business-hours' as any);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      padding: 8,
      marginRight: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600' as const,
      color: theme.colors.text.primary,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    scrollContent: {
      paddingVertical: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold' as const,
      color: theme.colors.text.primary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.text.secondary,
      marginBottom: 32,
      lineHeight: 22,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: theme.colors.text.primary,
      marginBottom: 16,
    },
    imageGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 32,
    },
    imageContainer: {
      width: imageSize,
      height: imageSize,
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    imageOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectedOverlay: {
      backgroundColor: `${theme.colors.purple}80`,
    },
    selectionIndicator: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.purple,
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectionNumber: {
      color: theme.colors.white,
      fontSize: 12,
      fontWeight: 'bold' as const,
    },
    addImageButton: {
      width: imageSize,
      height: imageSize,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
    },
    addImageText: {
      color: theme.colors.text.secondary,
      fontSize: 14,
      marginTop: 8,
      textAlign: 'center',
    },
    selectedImagesSection: {
      marginBottom: 32,
    },
    selectedImagesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    selectedImageContainer: {
      width: 80,
      height: 80,
      borderRadius: 8,
      overflow: 'hidden',
      position: 'relative',
    },
    selectedImage: {
      width: '100%',
      height: '100%',
    },
    removeButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.error,
      justifyContent: 'center',
      alignItems: 'center',
    },
    continueButton: {
      backgroundColor: theme.colors.purple,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginBottom: 20,
    },
    continueButtonDisabled: {
      backgroundColor: theme.colors.gray[600],
    },
    continueButtonText: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: theme.colors.white,
    },
    skipButton: {
      alignItems: 'center',
      padding: 16,
    },
    skipButtonText: {
      fontSize: 16,
      color: theme.colors.text.secondary,
    },
    counter: {
      fontSize: 14,
      color: theme.colors.text.secondary,
      textAlign: 'center' as const,
      marginBottom: 16,
    },
    requiredNote: {
      fontSize: 13,
      color: theme.colors.error ?? '#e74c3c',
      textAlign: 'center' as const,
      marginBottom: 16,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          testID="back-button"
        >
          <ArrowLeft size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gallery Images</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.scrollContent}>
          <Text style={styles.title}>Add Gallery Images</Text>
          <Text style={styles.subtitle}>
            Add at least {MIN_PHOTOS} photos that showcase your venue&apos;s atmosphere and style (max {MAX_PHOTOS})
          </Text>

          <Text style={styles.sectionTitle}>Choose from samples:</Text>
          <View style={styles.imageGrid}>
            {SAMPLE_IMAGES.map((imageUrl, index) => {
              const isSelected = !!selectedImages.find(img => img.uri === imageUrl);
              const selectionOrder = selectedImages.findIndex(img => img.uri === imageUrl);
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.imageContainer}
                  onPress={() => handleSampleSelect(imageUrl)}
                  testID={`sample-image-${index}`}
                >
                  <Image source={{ uri: imageUrl }} style={styles.image} />
                  <View style={[
                    styles.imageOverlay,
                    isSelected && styles.selectedOverlay
                  ]}>
                    {isSelected && (
                      <View style={styles.selectionIndicator}>
                        <Text style={styles.selectionNumber}>{selectionOrder + 1}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
            
            <TouchableOpacity
              style={styles.addImageButton}
              onPress={handleAddOwnImage}
              testID="add-image-button"
            >
              <Plus size={32} color={theme.colors.text.secondary} />
              <Text style={styles.addImageText}>Add your own{'\n'}image</Text>
            </TouchableOpacity>
          </View>

          {selectedImages.length > 0 && (
            <View style={styles.selectedImagesSection}>
              <Text style={styles.sectionTitle}>Selected Images:</Text>
              <Text style={styles.counter}>
                {selectedImages.length} of {MAX_PHOTOS} images selected
              </Text>
              {!canContinue && (
                <Text style={styles.requiredNote}>
                  {MIN_PHOTOS - selectedImages.length} more photo{MIN_PHOTOS - selectedImages.length > 1 ? 's' : ''} required
                </Text>
              )}
              <View style={styles.selectedImagesGrid}>
                {selectedImages.map((img, index) => (
                  <View key={index} style={styles.selectedImageContainer}>
                    <Image source={{ uri: img.uri }} style={styles.selectedImage} />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemove(img.uri)}
                      testID={`remove-image-${index}`}
                    >
                      <X size={12} color={theme.colors.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {selectedImages.length === 0 && (
            <Text style={[styles.requiredNote, { marginBottom: 24 }]}>
              At least {MIN_PHOTOS} photos are required to continue
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.continueButton,
              !canContinue && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!canContinue}
            testID="continue-button"
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}