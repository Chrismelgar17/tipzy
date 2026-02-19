import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useTheme } from '@/hooks/theme-context';
import { 
  Gift, 
  Calendar, 
  Percent,
  MoreVertical,
  Plus,
} from 'lucide-react-native';

interface Offer {
  id: string;
  name: string;
  discount: number;
  expirationDate: Date;
  status: 'active' | 'suspended';
  description: string;
  usedCount: number;
  totalCount: number;
}

const mockOffers: Offer[] = [
  {
    id: '1',
    name: 'Happy Hour Special',
    discount: 25,
    expirationDate: new Date('2024-12-31'),
    status: 'active',
    description: '25% off all drinks during happy hour',
    usedCount: 45,
    totalCount: 100,
  },
  {
    id: '2',
    name: 'Weekend VIP Package',
    discount: 15,
    expirationDate: new Date('2024-11-30'),
    status: 'active',
    description: '15% off VIP table bookings',
    usedCount: 12,
    totalCount: 50,
  },
  {
    id: '3',
    name: 'Student Discount',
    discount: 20,
    expirationDate: new Date('2024-10-15'),
    status: 'suspended',
    description: '20% off entry with valid student ID',
    usedCount: 8,
    totalCount: 30,
  },
];

type TabType = 'active' | 'suspended';

export default function OffersScreen() {
  const { theme } = useTheme();
  const [selectedTab, setSelectedTab] = useState<TabType>('active');

  const filteredOffers = mockOffers.filter(offer => offer.status === selectedTab);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
        <TouchableOpacity style={styles.moreButton} testID={`more-button-${item.id}`}>
          <MoreVertical size={20} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.offerDescription}>{item.description}</Text>

      <View style={styles.offerFooter}>
        <View style={styles.expirationInfo}>
          <Calendar size={16} color={theme.colors.text.secondary} />
          <Text style={styles.expirationText}>
            Expires {formatDate(item.expirationDate)}
          </Text>
        </View>
        <View style={styles.usageInfo}>
          <Text style={styles.usageText}>
            {item.usedCount}/{item.totalCount} used
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${(item.usedCount / item.totalCount) * 100}%` }
              ]} 
            />
          </View>
        </View>
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
      marginBottom: theme.spacing.lg,
    },
    offerFooter: {
      gap: theme.spacing.md,
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
    usageInfo: {
      gap: theme.spacing.sm,
    },
    usageText: {
      fontSize: 14,
      color: theme.colors.text.secondary,
      textAlign: 'right',
    },
    progressBar: {
      height: 4,
      backgroundColor: theme.colors.background,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.purple,
      borderRadius: 2,
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
          : 'You don\'t have any suspended offers at the moment.'
        }
      </Text>
      {type === 'active' && (
        <TouchableOpacity style={styles.createButton} testID="create-offer-button">
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
        {filteredOffers.length > 0 ? (
          <FlatList
            data={filteredOffers}
            renderItem={renderOfferCard}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
          />
        ) : (
          <EmptyState type={selectedTab} />
        )}
      </View>
    </View>
  );
}