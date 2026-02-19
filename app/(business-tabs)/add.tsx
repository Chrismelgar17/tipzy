import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '@/hooks/theme-context';
import { router } from 'expo-router';
import { 
  Gift, 
  Calendar, 
  X,
  Plus,
  Percent,
  Clock,
  FileText,
  Image as ImageIcon,
} from 'lucide-react-native';

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
  const [showModal, setShowModal] = useState(true);
  const [createType, setCreateType] = useState<CreateType>(null);
  
  const [offerForm, setOfferForm] = useState<OfferForm>({
    name: '',
    discount: '',
    endDate: '',
    description: '',
  });

  const [eventForm, setEventForm] = useState<EventForm>({
    name: '',
    date: '',
    time: '',
    description: '',
  });

  const handleClose = () => {
    setShowModal(false);
    router.back();
  };

  const handleCreateOffer = () => {
    setCreateType('offer');
  };

  const handleCreateEvent = () => {
    setCreateType('event');
  };

  const handleSaveOffer = () => {
    if (!offerForm.name || !offerForm.discount || !offerForm.endDate) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    Alert.alert('Success', 'Offer created successfully!', [
      { text: 'OK', onPress: handleClose }
    ]);
  };

  const handleSaveEvent = () => {
    if (!eventForm.name || !eventForm.date || !eventForm.time) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    Alert.alert('Success', 'Event created successfully!', [
      { text: 'OK', onPress: handleClose }
    ]);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.xl,
      width: '90%',
      maxHeight: '80%',
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text.primary,
    },
    closeButton: {
      padding: theme.spacing.sm,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    choiceContainer: {
      gap: theme.spacing.lg,
      paddingVertical: theme.spacing.xl,
    },
    choiceButton: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    choiceButtonActive: {
      borderColor: theme.colors.purple,
      backgroundColor: `${theme.colors.purple}10`,
    },
    choiceIcon: {
      marginBottom: theme.spacing.md,
    },
    choiceTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    choiceDescription: {
      fontSize: 14,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    formContainer: {
      gap: theme.spacing.lg,
    },
    inputGroup: {
      gap: theme.spacing.sm,
    },
    label: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text.primary,
    },
    requiredLabel: {
      color: theme.colors.error,
    },
    input: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      fontSize: 16,
      color: theme.colors.text.primary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    inputFocused: {
      borderColor: theme.colors.purple,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    inputIcon: {
      position: 'absolute',
      right: theme.spacing.md,
      top: theme.spacing.md,
    },
    inputWithIcon: {
      paddingRight: 48,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      paddingTop: theme.spacing.lg,
    },
    button: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
    },
    primaryButton: {
      backgroundColor: theme.colors.purple,
    },
    secondaryButton: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    primaryButtonText: {
      color: theme.colors.white,
    },
    secondaryButtonText: {
      color: theme.colors.text.primary,
    },
    uploadButton: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
    },
    uploadText: {
      fontSize: 14,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.sm,
    },
  });

  const renderChoiceScreen = () => (
    <View style={styles.choiceContainer}>
      <TouchableOpacity
        style={styles.choiceButton}
        onPress={handleCreateOffer}
        testID="create-offer-choice"
      >
        <View style={styles.choiceIcon}>
          <Gift size={48} color={theme.colors.purple} />
        </View>
        <Text style={styles.choiceTitle}>Create Offer</Text>
        <Text style={styles.choiceDescription}>
          Create special discounts and promotions to attract more customers
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.choiceButton}
        onPress={handleCreateEvent}
        testID="create-event-choice"
      >
        <View style={styles.choiceIcon}>
          <Calendar size={48} color={theme.colors.cyan} />
        </View>
        <Text style={styles.choiceTitle}>Create Event</Text>
        <Text style={styles.choiceDescription}>
          Organize events and manage ticket sales for your venue
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderOfferForm = () => (
    <View style={styles.formContainer}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Offer Name <Text style={styles.requiredLabel}>*</Text>
        </Text>
        <View>
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            placeholder="e.g., Happy Hour Special"
            placeholderTextColor={theme.colors.text.tertiary}
            value={offerForm.name}
            onChangeText={(text) => setOfferForm({ ...offerForm, name: text })}
            testID="offer-name-input"
          />
          <View style={styles.inputIcon}>
            <Gift size={20} color={theme.colors.text.secondary} />
          </View>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Discount Percentage <Text style={styles.requiredLabel}>*</Text>
        </Text>
        <View>
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            placeholder="e.g., 25"
            placeholderTextColor={theme.colors.text.tertiary}
            value={offerForm.discount}
            onChangeText={(text) => setOfferForm({ ...offerForm, discount: text })}
            keyboardType="numeric"
            testID="offer-discount-input"
          />
          <View style={styles.inputIcon}>
            <Percent size={20} color={theme.colors.text.secondary} />
          </View>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          End Date <Text style={styles.requiredLabel}>*</Text>
        </Text>
        <View>
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            placeholder="MM/DD/YYYY"
            placeholderTextColor={theme.colors.text.tertiary}
            value={offerForm.endDate}
            onChangeText={(text) => setOfferForm({ ...offerForm, endDate: text })}
            testID="offer-end-date-input"
          />
          <View style={styles.inputIcon}>
            <Calendar size={20} color={theme.colors.text.secondary} />
          </View>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <View>
          <TextInput
            style={[styles.input, styles.textArea, styles.inputWithIcon]}
            placeholder="Describe your offer..."
            placeholderTextColor={theme.colors.text.tertiary}
            value={offerForm.description}
            onChangeText={(text) => setOfferForm({ ...offerForm, description: text })}
            multiline
            numberOfLines={4}
            testID="offer-description-input"
          />
          <View style={styles.inputIcon}>
            <FileText size={20} color={theme.colors.text.secondary} />
          </View>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => setCreateType(null)}
          testID="cancel-offer-button"
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleSaveOffer}
          testID="save-offer-button"
        >
          <Text style={[styles.buttonText, styles.primaryButtonText]}>Save Offer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEventForm = () => (
    <View style={styles.formContainer}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Event Name <Text style={styles.requiredLabel}>*</Text>
        </Text>
        <View>
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            placeholder="e.g., Saturday Night Party"
            placeholderTextColor={theme.colors.text.tertiary}
            value={eventForm.name}
            onChangeText={(text) => setEventForm({ ...eventForm, name: text })}
            testID="event-name-input"
          />
          <View style={styles.inputIcon}>
            <Calendar size={20} color={theme.colors.text.secondary} />
          </View>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Date <Text style={styles.requiredLabel}>*</Text>
        </Text>
        <View>
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            placeholder="MM/DD/YYYY"
            placeholderTextColor={theme.colors.text.tertiary}
            value={eventForm.date}
            onChangeText={(text) => setEventForm({ ...eventForm, date: text })}
            testID="event-date-input"
          />
          <View style={styles.inputIcon}>
            <Calendar size={20} color={theme.colors.text.secondary} />
          </View>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Time <Text style={styles.requiredLabel}>*</Text>
        </Text>
        <View>
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            placeholder="HH:MM AM/PM"
            placeholderTextColor={theme.colors.text.tertiary}
            value={eventForm.time}
            onChangeText={(text) => setEventForm({ ...eventForm, time: text })}
            testID="event-time-input"
          />
          <View style={styles.inputIcon}>
            <Clock size={20} color={theme.colors.text.secondary} />
          </View>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <View>
          <TextInput
            style={[styles.input, styles.textArea, styles.inputWithIcon]}
            placeholder="Describe your event..."
            placeholderTextColor={theme.colors.text.tertiary}
            value={eventForm.description}
            onChangeText={(text) => setEventForm({ ...eventForm, description: text })}
            multiline
            numberOfLines={4}
            testID="event-description-input"
          />
          <View style={styles.inputIcon}>
            <FileText size={20} color={theme.colors.text.secondary} />
          </View>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Event Image (Optional)</Text>
        <TouchableOpacity style={styles.uploadButton} testID="upload-image-button">
          <ImageIcon size={32} color={theme.colors.text.secondary} />
          <Text style={styles.uploadText}>Tap to upload image</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => setCreateType(null)}
          testID="cancel-event-button"
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleSaveEvent}
          testID="save-event-button"
        >
          <Text style={[styles.buttonText, styles.primaryButtonText]}>Save Event</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getHeaderTitle = () => {
    if (createType === 'offer') return 'Create Offer';
    if (createType === 'event') return 'Create Event';
    return 'Create New';
  };

  const renderContent = () => {
    if (createType === 'offer') return renderOfferForm();
    if (createType === 'event') return renderEventForm();
    return renderChoiceScreen();
  };

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              testID="close-modal-button"
            >
              <X size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.content}>
            <ScrollView 
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.scrollContent}>
                {renderContent()}
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}