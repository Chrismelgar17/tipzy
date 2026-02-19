import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Stack } from 'expo-router';
import { CreditCard, Plus, Edit3, Trash2, Check } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { PaymentMethod } from '@/types/models';

export default function PaymentMethodsScreen() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'card',
      cardholderName: 'John Doe',
      cardNumber: '****1234',
      expirationDate: '12/26',
      isDefault: true,
      createdAt: new Date(),
    },
    {
      id: '2',
      type: 'card',
      cardholderName: 'John Doe',
      cardNumber: '****5678',
      expirationDate: '08/27',
      isDefault: false,
      createdAt: new Date(),
    },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newCard, setNewCard] = useState({
    cardholderName: '',
    cardNumber: '',
    expirationDate: '',
    cvv: '',
  });

  const handleAddCard = () => {
    if (!newCard.cardholderName || !newCard.cardNumber || !newCard.expirationDate || !newCard.cvv) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const lastFour = newCard.cardNumber.slice(-4);
    const newPaymentMethod: PaymentMethod = {
      id: Date.now().toString(),
      type: 'card',
      cardholderName: newCard.cardholderName,
      cardNumber: `****${lastFour}`,
      expirationDate: newCard.expirationDate,
      isDefault: paymentMethods.length === 0,
      createdAt: new Date(),
    };

    setPaymentMethods([...paymentMethods, newPaymentMethod]);
    setNewCard({ cardholderName: '', cardNumber: '', expirationDate: '', cvv: '' });
    setShowAddModal(false);
    Alert.alert('Success', 'Payment method added successfully');
  };

  const handleSetDefault = (id: string) => {
    setPaymentMethods(methods =>
      methods.map(method => ({
        ...method,
        isDefault: method.id === id,
      }))
    );
  };

  const handleRemoveCard = (id: string) => {
    const method = paymentMethods.find(m => m.id === id);
    if (method?.isDefault && paymentMethods.length > 1) {
      Alert.alert('Error', 'Cannot remove default payment method. Please set another card as default first.');
      return;
    }

    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setPaymentMethods(methods => methods.filter(m => m.id !== id));
          },
        },
      ]
    );
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const match = cleaned.match(/\d{1,4}/g);
    return match ? match.join(' ').substr(0, 19) : '';
  };

  const formatExpirationDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const renderPaymentMethod = (method: PaymentMethod) => (
    <View key={method.id} style={styles.paymentMethodCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <CreditCard size={24} color={theme.colors.purple} />
          <View style={styles.cardDetails}>
            <Text style={styles.cardNumber}>{method.cardNumber}</Text>
            <Text style={styles.cardHolder}>{method.cardholderName}</Text>
            <Text style={styles.cardExpiry}>Expires {method.expirationDate}</Text>
          </View>
        </View>
        {method.isDefault && (
          <View style={styles.defaultBadge}>
            <Check size={16} color={theme.colors.white} />
            <Text style={styles.defaultText}>Default</Text>
          </View>
        )}
      </View>
      <View style={styles.cardActions}>
        {!method.isDefault && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleSetDefault(method.id)}
          >
            <Text style={styles.actionButtonText}>Set as Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.removeButton]}
          onPress={() => handleRemoveCard(method.id)}
        >
          <Trash2 size={16} color={theme.colors.error} />
          <Text style={[styles.actionButtonText, styles.removeButtonText]}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Payment Methods',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text.primary,
        }}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <Plus size={20} color={theme.colors.white} />
            <Text style={styles.addButtonText}>Add Payment Method</Text>
          </TouchableOpacity>

          {paymentMethods.length === 0 ? (
            <View style={styles.emptyState}>
              <CreditCard size={64} color={theme.colors.text.tertiary} />
              <Text style={styles.emptyTitle}>No payment methods</Text>
              <Text style={styles.emptyDescription}>
                Add a payment method to make purchases easier and faster.
              </Text>
            </View>
          ) : (
            <View style={styles.paymentMethodsList}>
              <Text style={styles.sectionTitle}>Saved Payment Methods</Text>
              {paymentMethods.map(renderPaymentMethod)}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Card</Text>
            <TouchableOpacity onPress={handleAddCard}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cardholder Name</Text>
              <TextInput
                style={styles.input}
                value={newCard.cardholderName}
                onChangeText={(text) => setNewCard({ ...newCard, cardholderName: text })}
                placeholder="John Doe"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Card Number</Text>
              <TextInput
                style={styles.input}
                value={newCard.cardNumber}
                onChangeText={(text) => setNewCard({ ...newCard, cardNumber: formatCardNumber(text) })}
                placeholder="1234 5678 9012 3456"
                keyboardType="numeric"
                maxLength={19}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.inputLabel}>Expiration Date</Text>
                <TextInput
                  style={styles.input}
                  value={newCard.expirationDate}
                  onChangeText={(text) => setNewCard({ ...newCard, expirationDate: formatExpirationDate(text) })}
                  placeholder="MM/YY"
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.inputLabel}>CVV</Text>
                <TextInput
                  style={styles.input}
                  value={newCard.cvv}
                  onChangeText={(text) => setNewCard({ ...newCard, cvv: text.replace(/\D/g, '') })}
                  placeholder="123"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.purple,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  addButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyDescription: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  paymentMethodsList: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  paymentMethodCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  cardDetails: {
    flex: 1,
  },
  cardNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  cardHolder: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  cardExpiry: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  defaultText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  removeButton: {
    borderColor: theme.colors.error,
  },
  removeButtonText: {
    color: theme.colors.error,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  cancelButton: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.purple,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.card,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
});