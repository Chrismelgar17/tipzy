import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CreditCard, Lock, Check } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { mockEvents } from '@/mocks/venues';
import { useLocalSearchParams, router } from 'expo-router';
import { useTickets } from '@/hooks/tickets-context';
import { useAuth } from '@/hooks/auth-context';
import * as Haptics from 'expo-haptics';

export default function CheckoutScreen() {
  const { eventId } = useLocalSearchParams();
  const { purchaseTickets } = useTickets();
  const { user, requireAuth } = useAuth();
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple' | 'google'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // Require authentication for checkout
  if (!user) {
    requireAuth('purchase tickets');
    router.back();
    return null;
  }

  const event = mockEvents.find(e => e.id === eventId);

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  const handleQuantityChange = (productId: string, delta: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setSelectedProducts(prev => {
      const current = prev[productId] || 0;
      const newQty = Math.max(0, current + delta);
      const product = event.products.find(p => p.id === productId);
      
      if (product && newQty > (product.qtyTotal - product.qtySold)) {
        Alert.alert('Limited Availability', `Only ${product.qtyTotal - product.qtySold} tickets remaining`);
        return prev;
      }
      
      return { ...prev, [productId]: newQty };
    });
  };

  const calculateTotal = () => {
    return Object.entries(selectedProducts).reduce((total, [productId, qty]) => {
      const product = event.products.find(p => p.id === productId);
      return total + (product?.price || 0) * qty;
    }, 0);
  };

  const handleCheckout = async () => {
    const hasSelection = Object.values(selectedProducts).some(qty => qty > 0);
    
    if (!hasSelection) {
      Alert.alert('No Selection', 'Please select at least one ticket');
      return;
    }

    if (!agreeToTerms) {
      Alert.alert('Terms Required', 'Please agree to the terms and conditions');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setIsProcessing(true);

    try {
      const items = Object.entries(selectedProducts)
        .filter(([_, qty]) => qty > 0)
        .map(([productId, qty]) => ({
          product: event.products.find(p => p.id === productId)!,
          qty,
        }));

      await purchaseTickets(
        event.id,
        event.title,
        event.venueName || 'Venue',
        '123 Main St', // Mock address
        event.startAt,
        items
      );

      Alert.alert(
        'Purchase Successful!',
        'Your tickets have been added to your wallet',
        [
          {
            text: 'View Tickets',
            onPress: () => {
              router.replace('/profile' as any);
            },
          },
        ]
      );
    } catch {
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventDate}>
          {new Date(event.startAt).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
      </View>

      {/* Product Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Tickets</Text>
        {event.products.map((product) => {
          const qty = selectedProducts[product.id] || 0;
          const available = product.qtyTotal - product.qtySold;
          
          return (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productHeader}>
                <View>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productPrice}>${product.price}</Text>
                  {product.description && (
                    <Text style={styles.productDescription}>{product.description}</Text>
                  )}
                </View>
                {available < 10 && (
                  <View style={styles.limitedBadge}>
                    <Text style={styles.limitedText}>{available} left</Text>
                  </View>
                )}
              </View>
              
              {product.perks && (
                <View style={styles.perks}>
                  {product.perks.map((perk, index) => (
                    <View key={index} style={styles.perk}>
                      <Check size={12} color={theme.colors.success} />
                      <Text style={styles.perkText}>{perk}</Text>
                    </View>
                  ))}
                </View>
              )}
              
              <View style={styles.quantitySelector}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(product.id, -1)}
                  disabled={qty === 0}
                >
                  <Text style={styles.quantityButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.quantity}>{qty}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(product.id, 1)}
                  disabled={qty >= available}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* Payment Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        
        <TouchableOpacity
          style={[styles.paymentOption, paymentMethod === 'apple' && styles.paymentOptionActive]}
          onPress={() => setPaymentMethod('apple')}
        >
          <Text style={styles.paymentOptionText}>Apple Pay</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.paymentOption, paymentMethod === 'google' && styles.paymentOptionActive]}
          onPress={() => setPaymentMethod('google')}
        >
          <Text style={styles.paymentOptionText}>Google Pay</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.paymentOption, paymentMethod === 'card' && styles.paymentOptionActive]}
          onPress={() => setPaymentMethod('card')}
        >
          <CreditCard size={20} color={theme.colors.text.primary} />
          <Text style={styles.paymentOptionText}>Credit/Debit Card</Text>
        </TouchableOpacity>

        {paymentMethod === 'card' && (
          <View style={styles.cardForm}>
            <TextInput
              style={styles.input}
              placeholder="Card Number"
              placeholderTextColor={theme.colors.text.tertiary}
              value={cardNumber}
              onChangeText={setCardNumber}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Cardholder Name"
              placeholderTextColor={theme.colors.text.tertiary}
              value={cardName}
              onChangeText={setCardName}
            />
          </View>
        )}
      </View>

      {/* Terms */}
      <TouchableOpacity
        style={styles.termsContainer}
        onPress={() => setAgreeToTerms(!agreeToTerms)}
      >
        <View style={[styles.checkbox, agreeToTerms && styles.checkboxActive]}>
          {agreeToTerms && <Check size={14} color={theme.colors.white} />}
        </View>
        <Text style={styles.termsText}>
          I agree to the terms and conditions and refund policy
        </Text>
      </TouchableOpacity>

      {/* Order Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>${calculateTotal()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Service Fee</Text>
          <Text style={styles.summaryValue}>${(calculateTotal() * 0.1).toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryTotal]}>
          <Text style={styles.summaryTotalLabel}>Total</Text>
          <Text style={styles.summaryTotalValue}>
            ${(calculateTotal() * 1.1).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Checkout Button */}
      <TouchableOpacity
        style={styles.checkoutButton}
        onPress={handleCheckout}
        disabled={isProcessing || !agreeToTerms}
      >
        <LinearGradient
          colors={[theme.colors.purple, theme.colors.purpleLight]}
          style={styles.checkoutButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {isProcessing ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <>
              <Lock size={20} color={theme.colors.white} />
              <Text style={styles.checkoutButtonText}>
                Complete Purchase
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <Text style={styles.secureText}>
        Your payment information is encrypted and secure
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  eventDate: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  productCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.purple,
    marginTop: 4,
  },
  productDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  limitedBadge: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  limitedText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  perks: {
    marginVertical: theme.spacing.sm,
  },
  perk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  perkText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 20,
    color: theme.colors.text.primary,
  },
  quantity: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    minWidth: 30,
    textAlign: 'center',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  paymentOptionActive: {
    borderWidth: 2,
    borderColor: theme.colors.purple,
  },
  paymentOptionText: {
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  cardForm: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.text.primary,
    fontSize: 16,
    marginBottom: theme.spacing.sm,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: theme.colors.purple,
    borderColor: theme.colors.purple,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  summary: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  summaryValue: {
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    marginBottom: 0,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.purple,
  },
  checkoutButton: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  checkoutButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  checkoutButtonText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  secureText: {
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing.xl,
  },
  errorText: {
    color: theme.colors.text.primary,
    fontSize: 18,
    textAlign: 'center',
    marginTop: theme.spacing.xxl,
  },
});