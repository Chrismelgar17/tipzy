import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/theme-context';
import { useAuth } from '@/hooks/auth-context';
import { ArrowLeft, ChevronDown, Phone, Globe } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CATEGORIES = [
  'Nightclub',
  'Bar',
  'Lounge',
  'Restaurant & Bar',
  'Rooftop Bar',
  'Sports Bar',
  'Wine Bar',
  'Cocktail Bar',
  'Other'
];

const SERVICES = [
  'Live Music',
  'DJ Sets',
  'Dancing',
  'Food Service',
  'VIP Tables',
  'Bottle Service',
  'Private Events',
  'Karaoke',
  'Pool/Billiards',
  'Outdoor Seating'
];

export default function BusinessFormScreen() {
  const { theme } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Require the user to be signed in before registering a business
  if (!isLoading && !isAuthenticated) {
    router.replace('/(auth)/signin' as any);
    return null;
  }

  const [formData, setFormData] = useState({
    businessName: '',
    location: '',
    phone: '',
    website: '',
    category: '',
    services: [] as string[],
    description: '',
    maxCapacity: '',
    minEntryAge: '18+',
  });
  const [countryCode] = useState('+1');

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showServicesPicker, setShowServicesPicker] = useState(false);
  const [showAgePicker, setShowAgePicker] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const formatPhoneInput = (text: string): string => {
    if (!text || typeof text !== 'string') return '';
    
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    
    // Limit to 10 digits for US numbers
    if (cleaned.length > 10) return formData.phone;
    
    // Format as (XXX) XXX-XXXX for US numbers
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneInput(text);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  const handleServiceToggle = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
  };

  const handleContinue = async () => {
    if (!formData.businessName || !formData.location || !formData.phone ||
        !formData.category || !formData.maxCapacity || !formData.minEntryAge) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!ageConfirmed) {
      Alert.alert('Legal Confirmation Required', 'You must confirm that you will comply with all local alcohol and licensing laws');
      return;
    }

    if (formData.services.length === 0) {
      Alert.alert('Error', 'Please select at least one service');
      return;
    }

    const capacity = parseInt(formData.maxCapacity);
    if (isNaN(capacity) || capacity <= 0) {
      Alert.alert('Error', 'Please enter a valid maximum capacity');
      return;
    }

    try {
      const businessProfile = {
        businessName: formData.businessName,
        location: formData.location,
        phone: formData.phone,
        website: formData.website.trim() || undefined,
        category: formData.category,
        services: formData.services,
        description: formData.description,
        maxCapacity: capacity,
        currentCount: 0,
        minEntryAge: formData.minEntryAge,
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
        status: 'pending' as const,
        createdAt: new Date(),
      };
      await AsyncStorage.setItem('businessProfile', JSON.stringify(businessProfile));
    } catch (error) {
      console.error('Failed to save business profile:', error);
      Alert.alert('Error', 'Failed to save business information. Please try again.');
      return;
    }

    router.push('/onboarding/business-gallery' as any);
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
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: theme.colors.text.primary,
      marginBottom: 8,
    },
    required: {
      color: theme.colors.error,
    },
    input: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: theme.colors.text.primary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    picker: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    pickerText: {
      fontSize: 16,
      color: theme.colors.text.primary,
    },
    pickerPlaceholder: {
      color: theme.colors.text.secondary,
    },
    servicesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    serviceChip: {
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    serviceChipSelected: {
      backgroundColor: theme.colors.purple,
      borderColor: theme.colors.purple,
    },
    serviceChipText: {
      fontSize: 14,
      color: theme.colors.text.primary,
    },
    serviceChipTextSelected: {
      color: theme.colors.white,
    },
    continueButton: {
      backgroundColor: theme.colors.purple,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 32,
      marginBottom: 20,
    },
    continueButtonText: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: theme.colors.white,
    },
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    modalContent: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 20,
      width: '90%',
      maxHeight: '70%',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600' as const,
      color: theme.colors.text.primary,
      marginBottom: 16,
      textAlign: 'center',
    },
    modalOption: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalOptionText: {
      fontSize: 16,
      color: theme.colors.text.primary,
    },
    modalCloseButton: {
      backgroundColor: theme.colors.purple,
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
      marginTop: 16,
    },
    modalCloseButtonText: {
      color: theme.colors.white,
      fontWeight: '600' as const,
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginVertical: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderWidth: 2,
      borderColor: theme.colors.purple,
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 2,
    },
    checkboxChecked: {
      backgroundColor: theme.colors.purple,
    },
    checkmark: {
      color: theme.colors.white,
      fontSize: 12,
      fontWeight: '700' as const,
    },
    checkboxText: {
      flex: 1,
      color: theme.colors.text.primary,
      fontSize: 14,
      lineHeight: 20,
    },
    disclaimer: {
      backgroundColor: 'rgba(108, 92, 231, 0.05)',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: 'rgba(108, 92, 231, 0.2)',
      marginBottom: theme.spacing.md,
    },
    disclaimerText: {
      color: theme.colors.text.secondary,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'left',
    },
    phoneInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 16,
      height: 56,
      gap: 12,
    },
    phoneIcon: {
      marginRight: 4,
    },
    countryCodeButton: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRightWidth: 1,
      borderRightColor: theme.colors.border,
      marginRight: 8,
    },
    countryCodeText: {
      color: theme.colors.text.primary,
      fontSize: 16,
      fontWeight: '500' as const,
    },
    phoneInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text.primary,
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
        <Text style={styles.headerTitle}>Business Registration</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.scrollContent}>
          <Text style={styles.title}>Register Your Business</Text>
          <Text style={styles.subtitle}>
            Tell us about your venue to get started with Tipzy
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Business Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={formData.businessName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, businessName: text }))}
              placeholder="Your venue name"
              placeholderTextColor={theme.colors.text.secondary}
              testID="business-name-input"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Location <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={formData.location}
              onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
              placeholder="Full address"
              placeholderTextColor={theme.colors.text.secondary}
              testID="location-input"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Phone Number <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.phoneInputContainer}>
              <Phone size={20} color={theme.colors.text.secondary} style={styles.phoneIcon} />
              <View style={styles.countryCodeButton}>
                <Text style={styles.countryCodeText}>{countryCode}</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                value={formData.phone}
                onChangeText={handlePhoneChange}
                placeholder="Enter your phone number"
                placeholderTextColor={theme.colors.text.secondary}
                keyboardType="phone-pad"
                inputMode="numeric"
                maxLength={14}
                testID="phone-input"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Website</Text>
            <View style={styles.phoneInputContainer}>
              <Globe size={20} color={theme.colors.text.secondary} style={styles.phoneIcon} />
              <TextInput
                style={[styles.phoneInput, { flex: 1 }]}
                value={formData.website}
                onChangeText={(text) => setFormData(prev => ({ ...prev, website: text }))}
                placeholder="https://yourvenue.com"
                placeholderTextColor={theme.colors.text.secondary}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Category <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowCategoryPicker(true)}
              testID="category-picker"
            >
              <Text style={[
                styles.pickerText,
                !formData.category && styles.pickerPlaceholder
              ]}>
                {formData.category || 'Select category'}
              </Text>
              <ChevronDown size={20} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Types of Services <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.servicesContainer}>
              {SERVICES.map((service) => (
                <TouchableOpacity
                  key={service}
                  style={[
                    styles.serviceChip,
                    formData.services.includes(service) && styles.serviceChipSelected
                  ]}
                  onPress={() => handleServiceToggle(service)}
                  testID={`service-${service}`}
                >
                  <Text style={[
                    styles.serviceChipText,
                    formData.services.includes(service) && styles.serviceChipTextSelected
                  ]}>
                    {service}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Maximum Capacity <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={formData.maxCapacity}
              onChangeText={(text) => setFormData(prev => ({ ...prev, maxCapacity: text }))}
              placeholder="e.g. 200"
              placeholderTextColor={theme.colors.text.secondary}
              keyboardType="numeric"
              testID="max-capacity-input"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Minimum Entry Age <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowAgePicker(true)}
              testID="age-picker"
            >
              <Text style={[
                styles.pickerText,
                !formData.minEntryAge && styles.pickerPlaceholder
              ]}>
                {formData.minEntryAge || 'Select minimum entry age'}
              </Text>
              <ChevronDown size={20} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description/About</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Tell us about your venue, atmosphere, and what makes it special..."
              placeholderTextColor={theme.colors.text.secondary}
              multiline
              numberOfLines={4}
              testID="description-input"
            />
          </View>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setAgeConfirmed(!ageConfirmed)}
          >
            <View style={[styles.checkbox, ageConfirmed && styles.checkboxChecked]}>
              {ageConfirmed && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
            <Text style={styles.checkboxText}>
              I confirm that I will accurately state my minimum entry age and comply with all local alcohol and licensing laws
            </Text>
          </TouchableOpacity>

          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              By listing your venue on Tipzy, you agree to accurately state your minimum entry age (18+ or 21+) and to comply with all local alcohol and licensing laws.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            testID="continue-button"
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showCategoryPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <ScrollView>
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={styles.modalOption}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, category }));
                    setShowCategoryPicker(false);
                  }}
                  testID={`category-option-${category}`}
                >
                  <Text style={styles.modalOptionText}>{category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCategoryPicker(false)}
              testID="close-category-picker"
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showAgePicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Minimum Entry Age</Text>
            <ScrollView>
              {['18+', '21+'].map((age) => (
                <TouchableOpacity
                  key={age}
                  style={styles.modalOption}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, minEntryAge: age }));
                    setShowAgePicker(false);
                  }}
                  testID={`age-option-${age}`}
                >
                  <Text style={styles.modalOptionText}>{age} Entry</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowAgePicker(false)}
              testID="close-age-picker"
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}