import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useTheme } from '@/hooks/theme-context';
import { useAuth } from '@/hooks/auth-context';
import {
  Building,
  Clock,
  Camera,
  Save,
  Trash2,
  Plus,
  X,
  Globe,
} from 'lucide-react-native';
import { BusinessProfile, WorkHours, DayHours } from '@/types/models';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeJsonParse, clearCorruptedData } from '@/utils/storage';

interface FormData {
  businessName: string;
  email: string;
  phone: string;
  website: string;
  location: string;
  category: string;
  services: string;
  description: string;
  maxCapacity: string;
  galleryImages: string[];
  workHours: WorkHours;
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

const CATEGORIES = [
  'Nightclub',
  'Bar',
  'Lounge',
  'Restaurant',
  'Rooftop',
  'Sports Bar',
  'Wine Bar',
  'Cocktail Bar',
  'Other',
];

export default function BusinessProfileScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  
  const [formData, setFormData] = useState<FormData>({
    businessName: '',
    email: user?.email || '',
    phone: '',
    website: '',
    location: '',
    category: '',
    services: '',
    description: '',
    maxCapacity: '',
    galleryImages: [],
    workHours: {
      monday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
      tuesday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
      wednesday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
      thursday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
      friday: { isOpen: true, openTime: '09:00', closeTime: '02:00' },
      saturday: { isOpen: true, openTime: '09:00', closeTime: '02:00' },
      sunday: { isOpen: false, openTime: '09:00', closeTime: '22:00' },
    },
  });

  useEffect(() => {
    loadBusinessProfile();
  }, []);

  const loadBusinessProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem('businessProfile');
      if (stored && stored.trim()) {
        const profile = safeJsonParse<BusinessProfile | null>(stored, null);
        if (profile && typeof profile === 'object' && profile.businessName) {
          setFormData({
            businessName: profile.businessName,
            email: profile.email,
            phone: profile.phone,
            website: profile.website ?? '',
            location: profile.location,
            category: profile.category,
            services: profile.services.join(', '),
            description: profile.description,
            maxCapacity: profile.maxCapacity.toString(),
            galleryImages: profile.galleryImages,
            workHours: profile.workHours,
          });
        } else {
          console.warn('Invalid business profile format');
          await clearCorruptedData('businessProfile');
        }
      }
    } catch (error) {
      console.error('Failed to load business profile:', error);
    }
  };

  const handleSave = async () => {
    if (!formData.businessName.trim()) {
      Alert.alert('Error', 'Business name is required');
      return;
    }

    if (!formData.email.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }

    if (!formData.maxCapacity.trim() || isNaN(Number(formData.maxCapacity))) {
      Alert.alert('Error', 'Please enter a valid maximum capacity');
      return;
    }

    setIsLoading(true);
    try {
      const profile: BusinessProfile = {
        id: user?.id || 'business_' + Date.now(),
        businessName: formData.businessName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        website: formData.website.trim() || undefined,
        location: formData.location.trim(),
        category: formData.category,
        services: formData.services.split(',').map(s => s.trim()).filter(s => s),
        description: formData.description.trim(),
        maxCapacity: Number(formData.maxCapacity),
        currentCount: 0,
        galleryImages: formData.galleryImages,
        workHours: formData.workHours,
        minEntryAge: '21+',
        status: 'approved',
        createdAt: new Date(),
        approvedAt: new Date(),
      };

      await AsyncStorage.setItem('businessProfile', JSON.stringify(profile));
      Alert.alert('Success', 'Your business profile has been updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Failed to save business profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddImage = async () => {
    if (formData.galleryImages.length >= 5) {
      Alert.alert('Limit Reached', 'You can upload a maximum of 5 images.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newImages = [...formData.galleryImages, result.assets[0].uri];
      setFormData(prev => ({ ...prev, galleryImages: newImages }));
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = formData.galleryImages.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, galleryImages: newImages }));
  };

  const handleWorkHoursChange = (day: keyof WorkHours, field: keyof DayHours, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      workHours: {
        ...prev.workHours,
        [day]: {
          ...prev.workHours[day],
          [field]: value,
        },
      },
    }));
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your business account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('businessProfile');
              Alert.alert('Account Deleted', 'Your business account has been deleted.', [
                { text: 'OK', onPress: () => router.replace('/(auth)/signin' as any) }
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    section: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionIcon: {
      marginRight: theme.spacing.sm,
    },
    inputGroup: {
      marginBottom: theme.spacing.md,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      fontSize: 16,
      color: theme.colors.text.primary,
      backgroundColor: theme.colors.background,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    categoryContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    categoryChip: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    categoryChipSelected: {
      backgroundColor: theme.colors.purple,
      borderColor: theme.colors.purple,
    },
    categoryChipText: {
      fontSize: 14,
      color: theme.colors.text.secondary,
    },
    categoryChipTextSelected: {
      color: theme.colors.white,
    },
    imageGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    imageContainer: {
      width: '48%',
      aspectRatio: 16 / 9,
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
      position: 'relative',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    removeImageButton: {
      position: 'absolute',
      top: theme.spacing.sm,
      right: theme.spacing.sm,
      backgroundColor: 'rgba(0,0,0,0.7)',
      borderRadius: theme.borderRadius.full,
      padding: theme.spacing.xs,
    },
    addImageButton: {
      width: '48%',
      aspectRatio: 16 / 9,
      borderRadius: theme.borderRadius.md,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    addImageText: {
      fontSize: 14,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.xs,
    },
    workHoursContainer: {
      gap: theme.spacing.md,
    },
    dayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
    },
    dayLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text.primary,
      width: 80,
    },
    timeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginLeft: theme.spacing.md,
    },
    timeInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.sm,
      fontSize: 14,
      color: theme.colors.text.primary,
      backgroundColor: theme.colors.background,
      width: 70,
      textAlign: 'center',
    },
    timeSeparator: {
      marginHorizontal: theme.spacing.sm,
      fontSize: 14,
      color: theme.colors.text.secondary,
    },
    closedText: {
      fontSize: 14,
      color: theme.colors.text.tertiary,
      fontStyle: 'italic',
    },
    toggleButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    toggleButtonActive: {
      backgroundColor: theme.colors.success,
      borderColor: theme.colors.success,
    },
    toggleButtonText: {
      fontSize: 12,
      color: theme.colors.text.secondary,
    },
    toggleButtonTextActive: {
      color: theme.colors.white,
    },
    saveButton: {
      backgroundColor: theme.colors.purple,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.lg,
    },
    saveButtonDisabled: {
      backgroundColor: theme.colors.border,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.white,
      marginLeft: theme.spacing.sm,
    },
    deleteButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.error,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.error,
      marginLeft: theme.spacing.sm,
    },
  });

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Business Profile',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text.primary,
        }}
      />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.scrollContent}>
          {/* Business Details */}
          <View style={styles.section}>
            <View style={styles.sectionTitle}>
              <Building size={20} color={theme.colors.purple} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Business Details</Text>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.businessName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, businessName: text }))}
                placeholder="Enter your business name"
                placeholderTextColor={theme.colors.text.tertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                placeholder="business@example.com"
                placeholderTextColor={theme.colors.text.tertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                placeholder="(555) 123-4567"
                placeholderTextColor={theme.colors.text.tertiary}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Website</Text>
              <TextInput
                style={styles.input}
                value={formData.website}
                onChangeText={(text) => setFormData(prev => ({ ...prev, website: text }))}
                placeholder="https://yourvenue.com"
                placeholderTextColor={theme.colors.text.tertiary}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={formData.location}
                onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
                placeholder="123 Main St, City, State 12345"
                placeholderTextColor={theme.colors.text.tertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.categoryContainer}>
                {CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryChip,
                      formData.category === category && styles.categoryChipSelected,
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, category }))}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        formData.category === category && styles.categoryChipTextSelected,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Type of Services</Text>
              <TextInput
                style={styles.input}
                value={formData.services}
                onChangeText={(text) => setFormData(prev => ({ ...prev, services: text }))}
                placeholder="DJ, Live Music, Food, Cocktails (comma separated)"
                placeholderTextColor={theme.colors.text.tertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>About / Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="Tell customers about your business..."
                placeholderTextColor={theme.colors.text.tertiary}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Maximum Capacity *</Text>
              <TextInput
                style={styles.input}
                value={formData.maxCapacity}
                onChangeText={(text) => setFormData(prev => ({ ...prev, maxCapacity: text }))}
                placeholder="200"
                placeholderTextColor={theme.colors.text.tertiary}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Gallery Images */}
          <View style={styles.section}>
            <View style={styles.sectionTitle}>
              <Camera size={20} color={theme.colors.purple} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Gallery Images (Max 5)</Text>
            </View>
            
            <View style={styles.imageGrid}>
              {formData.galleryImages.map((uri, index) => (
                <View key={`image-${index}-${uri.slice(-10)}`} style={styles.imageContainer}>
                  <Image source={{ uri: uri || 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800' }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => handleRemoveImage(index)}
                  >
                    <X size={16} color={theme.colors.white} />
                  </TouchableOpacity>
                </View>
              ))}
              
              {formData.galleryImages.length < 5 && (
                <TouchableOpacity style={styles.addImageButton} onPress={handleAddImage}>
                  <Plus size={24} color={theme.colors.text.secondary} />
                  <Text style={styles.addImageText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Work Hours */}
          <View style={styles.section}>
            <View style={styles.sectionTitle}>
              <Clock size={20} color={theme.colors.purple} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Work Hours</Text>
            </View>
            
            <View style={styles.workHoursContainer}>
              {DAYS.map(({ key, label }) => (
                <View key={key} style={styles.dayRow}>
                  <Text style={styles.dayLabel}>{label}</Text>
                  
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      formData.workHours[key].isOpen && styles.toggleButtonActive,
                    ]}
                    onPress={() => handleWorkHoursChange(key, 'isOpen', !formData.workHours[key].isOpen)}
                  >
                    <Text
                      style={[
                        styles.toggleButtonText,
                        formData.workHours[key].isOpen && styles.toggleButtonTextActive,
                      ]}
                    >
                      {formData.workHours[key].isOpen ? 'Open' : 'Closed'}
                    </Text>
                  </TouchableOpacity>

                  {formData.workHours[key].isOpen ? (
                    <View style={styles.timeContainer}>
                      <TextInput
                        style={styles.timeInput}
                        value={formData.workHours[key].openTime}
                        onChangeText={(text) => handleWorkHoursChange(key, 'openTime', text)}
                        placeholder="09:00"
                        placeholderTextColor={theme.colors.text.tertiary}
                      />
                      <Text style={styles.timeSeparator}>to</Text>
                      <TextInput
                        style={styles.timeInput}
                        value={formData.workHours[key].closeTime}
                        onChangeText={(text) => handleWorkHoursChange(key, 'closeTime', text)}
                        placeholder="22:00"
                        placeholderTextColor={theme.colors.text.tertiary}
                      />
                    </View>
                  ) : (
                    <View style={styles.timeContainer}>
                      <Text style={styles.closedText}>Closed</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isLoading}
          >
            <Save size={20} color={theme.colors.white} />
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>

          {/* Delete Account */}
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Trash2 size={20} color={theme.colors.error} />
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}