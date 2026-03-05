import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/theme-context';
import { ArrowLeft, Building2, MapPin, Users, Volume2 } from 'lucide-react-native';
import api from '@/lib/api';

export default function AddVenueScreen() {
  const { theme } = useTheme();

  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [address, setAddress] = useState('');
  const [capacity, setCapacity] = useState('');
  const [minAge, setMinAge] = useState('18');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!businessName.trim()) {
      Alert.alert('Missing Info', 'Please enter a venue name.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/business/venues/add', {
        businessName: businessName.trim(),
        businessCategory: businessCategory.trim() || undefined,
        address: address.trim() || undefined,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        minAge: minAge ? parseInt(minAge, 10) : 18,
      });

      Alert.alert(
        'Submitted for Review! 🎉',
        'Your new venue is pending Tipzy admin approval. We\'ll email you as soon as it\'s live.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error ?? 'Could not submit the venue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: theme.spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text.primary,
    },
    headerSubtitle: {
      fontSize: 13,
      color: theme.colors.text.secondary,
    },
    content: {
      padding: theme.spacing.lg,
    },
    infoBanner: {
      backgroundColor: `${theme.colors.purple}18`,
      borderWidth: 1,
      borderColor: `${theme.colors.purple}40`,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.xl,
    },
    infoText: {
      fontSize: 14,
      color: theme.colors.text.secondary,
      lineHeight: 20,
    },
    infoHighlight: {
      color: theme.colors.purple,
      fontWeight: '600',
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text.primary,
    },
    fieldGroup: {
      gap: theme.spacing.md,
    },
    field: {
      gap: theme.spacing.sm,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text.secondary,
    },
    required: {
      color: theme.colors.error,
    },
    input: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      fontSize: 16,
      color: theme.colors.text.primary,
    },
    row: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    rowField: {
      flex: 1,
    },
    submitButton: {
      backgroundColor: theme.colors.purple,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.xxl,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing.sm,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitText: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.white,
    },
    note: {
      fontSize: 13,
      color: theme.colors.text.tertiary,
      textAlign: 'center',
      marginTop: theme.spacing.md,
      lineHeight: 18,
    },
  });

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Add New Venue</Text>
          <Text style={styles.headerSubtitle}>Each venue counts as its own plan</Text>
        </View>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>
            You can manage{' '}
            <Text style={styles.infoHighlight}>multiple venues</Text>{' '}
            from one Tipzy account. Each venue requires admin approval and counts as a{' '}
            <Text style={styles.infoHighlight}>separate plan</Text>.
          </Text>
        </View>

        {/* Venue Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Building2 size={18} color={theme.colors.purple} />
            <Text style={styles.sectionTitle}>Venue Details</Text>
          </View>
          <View style={styles.fieldGroup}>
            <View style={styles.field}>
              <Text style={styles.label}>
                Venue Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. The Rooftop Bar"
                placeholderTextColor={theme.colors.text.tertiary}
                value={businessName}
                onChangeText={setBusinessName}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Category</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Cocktail Bar, Night Club..."
                placeholderTextColor={theme.colors.text.tertiary}
                value={businessCategory}
                onChangeText={setBusinessCategory}
              />
            </View>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={18} color={theme.colors.purple} />
            <Text style={styles.sectionTitle}>Location</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Street, City, State"
              placeholderTextColor={theme.colors.text.tertiary}
              value={address}
              onChangeText={setAddress}
            />
          </View>
        </View>

        {/* Capacity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={18} color={theme.colors.purple} />
            <Text style={styles.sectionTitle}>Capacity &amp; Age</Text>
          </View>
          <View style={styles.row}>
            <View style={[styles.field, styles.rowField]}>
              <Text style={styles.label}>Max Capacity</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 200"
                placeholderTextColor={theme.colors.text.tertiary}
                keyboardType="number-pad"
                value={capacity}
                onChangeText={setCapacity}
              />
            </View>
            <View style={[styles.field, styles.rowField]}>
              <Text style={styles.label}>Min Age</Text>
              <TextInput
                style={styles.input}
                placeholder="18"
                placeholderTextColor={theme.colors.text.tertiary}
                keyboardType="number-pad"
                value={minAge}
                onChangeText={setMinAge}
              />
            </View>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.white} />
          ) : (
            <>
              <Building2 size={20} color={theme.colors.white} />
              <Text style={styles.submitText}>Submit for Approval</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.note}>
          The Tipzy team will review your new venue and notify you by email.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
