import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '@/hooks/theme-context';
import { router } from 'expo-router';
import { 
  Gift, 
  Calendar, 
  X,
  Percent,
  Clock,
  FileText,
} from 'lucide-react-native';
import api from '@/lib/api';

type CreateType = 'offer' | 'event' | null;

interface OfferForm {
  name: string;
  discount: string;
  endDate: string;
  description: string;
}

interface EventForm {
  name: string;
  date: string;
  time: string;
  description: string;
}

export default function AddScreen() {
  const { theme } = useTheme();
  const [createType, setCreateType] = useState<CreateType>(null);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [loadingVenue, setLoadingVenue] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [offerForm, setOfferForm] = useState<OfferForm>({ name: '', discount: '', endDate: '', description: '' });
  const [eventForm, setEventForm] = useState<EventForm>({ name: '', date: '', time: '', description: '' });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/business/venues');
        const venues = res.data?.venues ?? [];
        if (venues.length > 0) setVenueId(venues[0].id);
      } catch (err) {
        console.warn('[AddScreen] Could not fetch venues:', err);
      } finally {
        setLoadingVenue(false);
      }
    })();
  }, []);

  const handleClose = () => { router.back(); };
  const handleCreateOffer = () => setCreateType('offer');
  const handleCreateEvent = () => setCreateType('event');

  const handleSaveOffer = async () => {
    if (!offerForm.name || !offerForm.discount || !offerForm.endDate) {
      Alert.alert('Error', 'Please fill in all required fields'); return;
    }
    if (!venueId) {
      Alert.alert('Error', 'No venue found for your account.'); return;
    }
    setSaving(true);
    try {
      await api.post('/business/offers', {
        venueId, name: offerForm.name, discount: Number(offerForm.discount),
        endDate: offerForm.endDate || undefined, description: offerForm.description || undefined,
      });
      Alert.alert('Success', 'Offer created successfully!', [{ text: 'OK', onPress: handleClose }]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error ?? 'Failed to create offer. Please try again.');
    } finally { setSaving(false); }
  };

  const handleSaveEvent = async () => {
    if (!eventForm.name || !eventForm.date || !eventForm.time) {
      Alert.alert('Error', 'Please fill in all required fields'); return;
    }
    if (!venueId) {
      Alert.alert('Error', 'No venue found for your account.'); return;
    }
    setSaving(true);
    try {
      await api.post('/business/events', {
        venueId, name: eventForm.name, date: eventForm.date, time: eventForm.time,
        description: eventForm.description || undefined,
      });
      Alert.alert('Success', 'Event created successfully!', [{ text: 'OK', onPress: handleClose }]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error ?? 'Failed to create event. Please try again.');
    } finally { setSaving(false); }
  };

  const getHeaderTitle = () => {
    if (createType === 'offer') return 'Create Offer';
    if (createType === 'event') return 'Create Event';
    return 'Create New';
  };

  const renderChoiceScreen = () => {
    if (loadingVenue) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.purple} />
          <Text style={styles.loadingText}>Loading your venue</Text>
        </View>
      );
    }
    return (
      <View style={styles.choiceContainer}>
        <TouchableOpacity style={styles.choiceButton} onPress={handleCreateOffer} testID="create-offer-choice">
          <View style={styles.choiceIcon}><Gift size={48} color={theme.colors.purple} /></View>
          <Text style={styles.choiceTitle}>Create Offer</Text>
          <Text style={styles.choiceDescription}>Create special discounts and promotions to attract more customers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.choiceButton} onPress={handleCreateEvent} testID="create-event-choice">
          <View style={styles.choiceIcon}><Calendar size={48} color={theme.colors.cyan} /></View>
          <Text style={styles.choiceTitle}>Create Event</Text>
          <Text style={styles.choiceDescription}>Organize events and manage ticket sales for your venue</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderOfferForm = () => (
    <View style={styles.formContainer}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Offer Name <Text style={styles.requiredLabel}>*</Text></Text>
        <View>
          <TextInput style={[styles.input, styles.inputWithIcon]} placeholder="e.g., Happy Hour Special"
            placeholderTextColor={theme.colors.text.tertiary} value={offerForm.name}
            onChangeText={(t) => setOfferForm({ ...offerForm, name: t })} testID="offer-name-input" />
          <View style={styles.inputIcon}><Gift size={20} color={theme.colors.text.secondary} /></View>
        </View>
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Discount % <Text style={styles.requiredLabel}>*</Text></Text>
        <View>
          <TextInput style={[styles.input, styles.inputWithIcon]} placeholder="e.g., 25"
            placeholderTextColor={theme.colors.text.tertiary} value={offerForm.discount}
            onChangeText={(t) => setOfferForm({ ...offerForm, discount: t })} keyboardType="numeric" testID="offer-discount-input" />
          <View style={styles.inputIcon}><Percent size={20} color={theme.colors.text.secondary} /></View>
        </View>
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>End Date <Text style={styles.requiredLabel}>*</Text></Text>
        <View>
          <TextInput style={[styles.input, styles.inputWithIcon]} placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.colors.text.tertiary} value={offerForm.endDate}
            onChangeText={(t) => setOfferForm({ ...offerForm, endDate: t })} testID="offer-end-date-input" />
          <View style={styles.inputIcon}><Calendar size={20} color={theme.colors.text.secondary} /></View>
        </View>
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="Describe your offer..."
          placeholderTextColor={theme.colors.text.tertiary} value={offerForm.description}
          onChangeText={(t) => setOfferForm({ ...offerForm, description: t })} multiline numberOfLines={4} testID="offer-description-input" />
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => setCreateType(null)} disabled={saving} testID="cancel-offer-button">
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleSaveOffer} disabled={saving} testID="save-offer-button">
          {saving ? <ActivityIndicator size="small" color={theme.colors.white} /> : <Text style={[styles.buttonText, styles.primaryButtonText]}>Save Offer</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEventForm = () => (
    <View style={styles.formContainer}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Event Name <Text style={styles.requiredLabel}>*</Text></Text>
        <View>
          <TextInput style={[styles.input, styles.inputWithIcon]} placeholder="e.g., Saturday Night Party"
            placeholderTextColor={theme.colors.text.tertiary} value={eventForm.name}
            onChangeText={(t) => setEventForm({ ...eventForm, name: t })} testID="event-name-input" />
          <View style={styles.inputIcon}><Calendar size={20} color={theme.colors.text.secondary} /></View>
        </View>
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Date <Text style={styles.requiredLabel}>*</Text></Text>
        <View>
          <TextInput style={[styles.input, styles.inputWithIcon]} placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.colors.text.tertiary} value={eventForm.date}
            onChangeText={(t) => setEventForm({ ...eventForm, date: t })} testID="event-date-input" />
          <View style={styles.inputIcon}><Calendar size={20} color={theme.colors.text.secondary} /></View>
        </View>
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Time <Text style={styles.requiredLabel}>*</Text></Text>
        <View>
          <TextInput style={[styles.input, styles.inputWithIcon]} placeholder="HH:MM e.g., 21:00"
            placeholderTextColor={theme.colors.text.tertiary} value={eventForm.time}
            onChangeText={(t) => setEventForm({ ...eventForm, time: t })} testID="event-time-input" />
          <View style={styles.inputIcon}><Clock size={20} color={theme.colors.text.secondary} /></View>
        </View>
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="Describe your event..."
          placeholderTextColor={theme.colors.text.tertiary} value={eventForm.description}
          onChangeText={(t) => setEventForm({ ...eventForm, description: t })} multiline numberOfLines={4} testID="event-description-input" />
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => setCreateType(null)} disabled={saving} testID="cancel-event-button">
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleSaveEvent} disabled={saving} testID="save-event-button">
          {saving ? <ActivityIndicator size="small" color={theme.colors.white} /> : <Text style={[styles.buttonText, styles.primaryButtonText]}>Save Event</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContent = () => {
    if (createType === 'offer') return renderOfferForm();
    if (createType === 'event') return renderEventForm();
    return renderChoiceScreen();
  };

  const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    headerTitle: { fontSize: 20, fontWeight: '600', color: theme.colors.text.primary },
    closeButton: { padding: theme.spacing.sm },
    content: { flex: 1 },
    scrollContent: { padding: theme.spacing.lg },
    choiceContainer: { gap: theme.spacing.lg, paddingVertical: theme.spacing.xl },
    choiceButton: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.xl, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
    choiceIcon: { marginBottom: theme.spacing.md },
    choiceTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text.primary, marginBottom: theme.spacing.sm },
    choiceDescription: { fontSize: 14, color: theme.colors.text.secondary, textAlign: 'center', lineHeight: 20 },
    formContainer: { gap: theme.spacing.lg },
    inputGroup: { gap: theme.spacing.sm },
    label: { fontSize: 16, fontWeight: '500', color: theme.colors.text.primary },
    requiredLabel: { color: theme.colors.error },
    input: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, fontSize: 16, color: theme.colors.text.primary, borderWidth: 1, borderColor: theme.colors.border },
    textArea: { minHeight: 100, textAlignVertical: 'top' },
    inputIcon: { position: 'absolute', right: theme.spacing.md, top: theme.spacing.md },
    inputWithIcon: { paddingRight: 48 },
    buttonContainer: { flexDirection: 'row', gap: theme.spacing.md, paddingTop: theme.spacing.lg },
    button: { flex: 1, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center' },
    primaryButton: { backgroundColor: theme.colors.purple },
    secondaryButton: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
    buttonText: { fontSize: 16, fontWeight: '600' },
    primaryButtonText: { color: theme.colors.white },
    secondaryButtonText: { color: theme.colors.text.primary },
    loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.xxl, gap: theme.spacing.md },
    loadingText: { fontSize: 14, color: theme.colors.text.secondary },
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose} testID="close-modal-button">
          <X size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.scrollContent}>{renderContent()}</View>
      </ScrollView>
    </SafeAreaView>
  );
}