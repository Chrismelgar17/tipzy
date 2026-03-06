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
  Zap,
} from 'lucide-react-native';
import api from '@/lib/api';

interface Offer {
  id: string;
  venue_id: string;
  venue_name: string;
  name: string;
  discount: number;
  end_date: string | null;
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  description: string | null;
  created_at: string;
  sponsor_status?: string | null;
  sponsored_until?: string | null;
}

type TabType = 'pending' | 'active' | 'suspended' | 'rejected';

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

  const filteredOffers = offers.filter(o => o.status === selectedTab);

  const getStatusColor = (status: Offer['status']) => {
    if (status === 'active') return theme.colors.success;
    if (status === 'pending') return '#F59E0B';
    if (status === 'rejected') return '#EF4444';
    return theme.colors.warning;
  };

  const pendingCount = offers.filter(o => o.status === 'pending').length;

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
      `Delete "${offer.name}"? This cannot be undone.`,      [
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

  const handleRequestSponsor = (offer: Offer) => {
    Alert.alert(
      '⭐ Boost on Home Page',
      `Submit "${offer.name}" for homepage sponsorship?\n\nJaber will review and approve within 24 hours. If approved, your offer will be featured at the top of the Tipzy home page for 3 days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Sponsorship',
          onPress: async () => {
            try {
              await api.post(`/business/offers/${offer.id}/request-sponsor`);
              setOffers(prev =>
                prev.map(o => o.id === offer.id ? { ...o, sponsor_status: 'pending' } : o),
              );
              Alert.alert('✅ Request Submitted', 'Your sponsorship request has been sent to Jaber for review.');
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.error ?? 'Could not submit sponsorship request.');
            }
          },
        },
      ],
    );
  };

  const handleMoreOptions = (offer: Offer) => {    if (offer.status === 'pending' || offer.status === 'rejected') {
      Alert.alert(offer.name, 'What would you like to do?', [
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(offer) },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
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
            <View style={[styles.statusBadge, { borderColor: getStatusColor(item.status) + '50', backgroundColor: getStatusColor(item.status) + '18' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status === 'pending' ? '⏳ PENDING REVIEW' : item.status === 'rejected' ? '❌ REJECTED' : item.status.toUpperCase()}
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

      {/* Sponsor row — only shown for active offers */}
      {item.status === 'active' && (
        <View style={styles.sponsorRow}>
          {(!item.sponsor_status || item.sponsor_status === 'none') && (
            <TouchableOpacity
              style={styles.boostBtn}
              onPress={() => handleRequestSponsor(item)}
            >
              <Zap size={14} color="#F59E0B" />
              <Text style={styles.boostBtnText}>Boost on Home Page</Text>
            </TouchableOpacity>
          )}
          {item.sponsor_status === 'pending' && (
            <View style={styles.sponsorBadge}>
              <Text style={styles.sponsorBadgeText}>⏳ Sponsorship in Review</Text>
            </View>
          )}
          {item.sponsor_status === 'approved' && (
            <View style={[styles.sponsorBadge, styles.sponsorBadgeApproved]}>
              <Text style={[styles.sponsorBadgeText, { color: '#F59E0B' }]}>⭐ Featured on Home Page</Text>
            </View>
          )}
          {item.sponsor_status === 'rejected' && (
            <TouchableOpacity
              style={[styles.sponsorBadge, styles.sponsorBadgeRejected]}
              onPress={() => handleRequestSponsor({ ...item, sponsor_status: 'none' })}
            >
              <Text style={[styles.sponsorBadgeText, { color: '#EF4444' }]}>❌ Sponsor Rejected — Try Again</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
    pendingTab: {
      backgroundColor: '#92400E',
    },
    rejectedTab: {
      backgroundColor: '#7F1D1D',
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
    sponsorRow: {
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    boostBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: 'rgba(245,158,11,0.10)',
      borderWidth: 1,
      borderColor: 'rgba(245,158,11,0.4)',
    },
    boostBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#F59E0B',
    },
    sponsorBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: 'rgba(156,163,175,0.10)',
      borderWidth: 1,
      borderColor: 'rgba(156,163,175,0.25)',
    },
    sponsorBadgeApproved: {
      backgroundColor: 'rgba(245,158,11,0.10)',
      borderColor: 'rgba(245,158,11,0.4)',
    },
    sponsorBadgeRejected: {
      backgroundColor: 'rgba(239,68,68,0.08)',
      borderColor: 'rgba(239,68,68,0.3)',
    },
    sponsorBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#9CA3AF',
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
          : type === 'pending'
          ? 'Offers waiting for Tipzy admin approval will appear here.'
          : type === 'rejected'
          ? 'Rejected offers appear here. Contact tipzy.team@gmail.com for more info.'
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
          style={[styles.tab, selectedTab === 'pending' && styles.pendingTab]}
          onPress={() => setSelectedTab('pending')}
          testID="pending-tab"
        >
          <Text style={[styles.tabText, selectedTab === 'pending' && styles.activeTabText]}>
            Pending{pendingCount > 0 ? ` (${pendingCount})` : ''}
          </Text>
        </TouchableOpacity>
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
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'rejected' && styles.rejectedTab]}
          onPress={() => setSelectedTab('rejected')}
          testID="rejected-tab"
        >
          <Text style={[styles.tabText, selectedTab === 'rejected' && styles.activeTabText]}>
            Rejected
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