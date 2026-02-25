import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTheme } from '@/hooks/theme-context';
import { useFocusEffect, router } from 'expo-router';
import { 
  Gift, 
  Calendar, 
  Percent,
  MoreVertical,
  Plus,
} from 'lucide-react-native';
import api from '@/lib/api';

interface Offer {
  id: string;
  venue_id: string;
  venue_name: string;
  name: string;
  discount: number;
  end_date: string | null;
  status: 'active' | 'suspended';
  description: string | null;
  created_at: string;
}

type TabType = 'active' | 'suspended';

export default function OffersScreen() {
  const { theme } = useTheme();
  const [selectedTab, setSelectedTab] = useState<TabType>('active');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOffers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get('/business/offers');
      setOffers(res.data?.offers ?? []);
    } catch (err) {
      console.error('[OffersScreen] fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOffers();
    }, [fetchOffers]),
  );

  const filteredOffers = offers.filter(offer => offer.status === selectedTab);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No expiry';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleToggleStatus = (offer: Offer) => {
    const newStatus = offer.status === 'active' ? 'suspended' : 'active';
    const label = newStatus === 'active' ? 'Activate' : 'Suspend';
    Alert.alert(
      `${label} Offer`,
      `Are you sure you want to ${label.toLowerCase()} "${offer.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: label,
          onPress: async () => {
            try {
              await api.patch(`/business/offers/${offer.id}/status`, { status: newStatus });
              setOffers(prev =>
                prev.map(o => (o.id === offer.id ? { ...o, status: newStatus } : o)),
              );
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.error ?? 'Could not update offer status.');
            }
          },
        },
      ],
    );
  };

  const handleDelete = (offer: Offer) => {
    Alert.alert(
      'Delete Offer',
      `Delete "${offer.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/business/offers/${offer.id}`);
              setOffers(prev => prev.filter(o => o.id !== offer.id));
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.error ?? 'Could not delete offer.');
            }
          },
        },
      ],
    );
  };

  const handleMoreOptions = (offer: Offer) => {
    const toggleLabel = offer.status === 'active' ? 'Suspend Offer' : 'Activate Offer';
    Alert.alert(offer.name, 'What would you like to do?', [
      { text: toggleLabel, onPress: () => handleToggleStatus(offer) },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(offer) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderOfferCard = ({ item }: { item: Offer }) => (
    <View style={styles.offerCard} testID={`offer-card-${item.id}`}>
      <View style={styles.offerHeader}>
        <View style={styles.offerIcon}>
          <Gift size={24} color={theme.colors.purple} />
        </View>
        <View style={styles.offerInfo}>
          <Text style={styles.offerName}>{item.name}</Text>
          <View style={styles.offerMeta}>
            <View style={styles.discountBadge}>
              <Percent size={12} color={theme.colors.white} />
              <Text style={styles.discountText}>{item.discount}% OFF</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={[
                styles.statusText,
                { color: item.status === 'active' ? theme.colors.success : theme.colors.warning }
              ]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => handleMoreOptions(item)}
          testID={`more-button-${item.id}`}
        >
          <MoreVertical size={20} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {item.description ? (
        <Text style={styles.offerDescription}>{item.description}</Text>
      ) : null}

      <View style={styles.offerFooter}>
        <View style={styles.expirationInfo}>
          <Calendar size={16} color={theme.colors.text.secondary} />
          <Text style={styles.expirationText}>
            Expires {formatDate(item.end_date)}
          </Text>
        </View>
        {item.venue_name ? (
          <Text style={styles.venueName}>{item.venue_name}</Text>
        ) : null}
      </View>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.card,
      margin: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
      padding: 4,
    },
    tab: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.sm,
      alignItems: 'center',
    },
    activeTab: {
      backgroundColor: theme.colors.purple,
    },
    tabText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text.secondary,
    },
    activeTabText: {
      color: theme.colors.white,
    },
    listContainer: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
    },
    offerCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    offerHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.md,
    },
    offerIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: `${theme.colors.purple}20`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    offerInfo: {
      flex: 1,
    },
    offerName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    offerMeta: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    discountBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.purple,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.sm,
      gap: 4,
    },
    discountText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.white,
    },
    statusBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.background,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    moreButton: {
      padding: theme.spacing.sm,
    },
    offerDescription: {
      fontSize: 14,
      color: theme.colors.text.secondary,
      lineHeight: 20,
      marginBottom: theme.spacing.md,
    },
    offerFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    expirationInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    expirationText: {
      fontSize: 14,
      color: theme.colors.text.secondary,
    },
    venueName: {
      fontSize: 13,
      color: theme.colors.text.tertiary,
      fontStyle: 'italic',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing.xxl,
    },
    emptyIcon: {
      marginBottom: theme.spacing.lg,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    emptyDescription: {
      fontSize: 16,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: theme.spacing.xl,
    },
    createButton: {
      backgroundColor: theme.colors.purple,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      gap: theme.spacing.sm,
    },
    createButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.white,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing.xxl,
    },
  });

  const EmptyState = ({ type }: { type: TabType }) => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Gift size={64} color={theme.colors.text.tertiary} />
      </View>
      <Text style={styles.emptyTitle}>
        No {type} offers
      </Text>
      <Text style={styles.emptyDescription}>
        {type === 'active'
          ? 'Create your first offer to start attracting customers with special deals and discounts.'
          : "You don't have any suspended offers at the moment."
        }
      </Text>
      {type === 'active' && (
        <TouchableOpacity style={styles.createButton} onPress={() => router.push('/(business-tabs)/add')} testID="create-offer-button">
          <Plus size={20} color={theme.colors.white} />
          <Text style={styles.createButtonText}>Create Offer</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'active' && styles.activeTab]}
          onPress={() => setSelectedTab('active')}
          testID="active-tab"
        >
          <Text style={[styles.tabText, selectedTab === 'active' && styles.activeTabText]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'suspended' && styles.activeTab]}
          onPress={() => setSelectedTab('suspended')}
          testID="suspended-tab"
        >
          <Text style={[styles.tabText, selectedTab === 'suspended' && styles.activeTabText]}>
            Suspended
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.purple} />
          </View>
        ) : filteredOffers.length > 0 ? (
          <FlatList
            data={filteredOffers}
            renderItem={renderOfferCard}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchOffers(true)}
                tintColor={theme.colors.purple}
              />
            }
          />
        ) : (
          <EmptyState type={selectedTab} />
        )}
      </View>
    </View>
  );
}