import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  Image,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/theme-context';
import { ArrowLeft, Plus, X } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const imageSize = (width - 60) / 2;

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
  
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const handleImageSelect = (imageUrl: string) => {
    if (selectedImages.includes(imageUrl)) {
      setSelectedImages(prev => prev.filter(img => img !== imageUrl));
    } else if (selectedImages.length < 5) {
      setSelectedImages(prev => [...prev, imageUrl]);
    }
  };

  const handleContinue = () => {
    if (selectedImages.length === 0) {
      return;
    }
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
      textAlign: 'center',
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
            Upload 1-5 photos that showcase your venue&apos;s atmosphere and style
          </Text>

          <Text style={styles.sectionTitle}>Choose from samples:</Text>
          <View style={styles.imageGrid}>
            {SAMPLE_IMAGES.map((imageUrl, index) => (
              <TouchableOpacity
                key={index}
                style={styles.imageContainer}
                onPress={() => handleImageSelect(imageUrl)}
                testID={`sample-image-${index}`}
              >
                <Image source={{ uri: imageUrl || 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800' }} style={styles.image} />
                <View style={[
                  styles.imageOverlay,
                  selectedImages.includes(imageUrl) && styles.selectedOverlay
                ]}>
                  {selectedImages.includes(imageUrl) && (
                    <View style={styles.selectionIndicator}>
                      <Text style={styles.selectionNumber}>
                        {selectedImages.indexOf(imageUrl) + 1}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity 
              style={styles.addImageButton}
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
                {selectedImages.length} of 5 images selected
              </Text>
              <View style={styles.selectedImagesGrid}>
                {selectedImages.map((imageUrl, index) => (
                  <View key={index} style={styles.selectedImageContainer}>
                    <Image source={{ uri: imageUrl || 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800' }} style={styles.selectedImage} />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleImageSelect(imageUrl)}
                      testID={`remove-image-${index}`}
                    >
                      <X size={12} color={theme.colors.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.continueButton,
              selectedImages.length === 0 && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={selectedImages.length === 0}
            testID="continue-button"
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => router.push('/onboarding/business-hours' as any)}
            testID="skip-button"
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}