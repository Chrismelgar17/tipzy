import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useTheme } from '@/hooks/theme-context';
import {
  ShoppingCart,
  User,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  Package,
  RefreshCw,
} from 'lucide-react-native';
import { VenueOrder } from '@/types/models';
import api from '@/lib/api';

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type BusinessStatus = VenueOrder['businessStatus'];
type FilterTab = 'all' | BusinessStatus;

// â”€â”€ Mock fallback data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MOCK_ORDERS: VenueOrder[] = [
  {
    id: '1', orderId: '1', userId: 'u1',
    customerName: 'John Smith', customerEmail: 'john@example.com',
    venueId: 'v1', venueName: 'Club Nova',
    eventId: 'e1', eventTitle: 'Saturday Night',
    product: 'VIP Table Booking', quantity: 1, amountTotal: 250, currency: 'USD',
    businessStatus: 'pending', orderDate: new Date('2024-01-15T19:30:00'),
  },
  {
    id: '2', orderId: '2', userId: 'u2',
    customerName: 'Sarah Johnson', customerEmail: 'sarah@example.com',
    venueId: 'v1', venueName: 'Club Nova',
    eventId: 'e1', eventTitle: 'Saturday Night',
    product: 'Happy Hour Special', quantity: 2, amountTotal: 45, currency: 'USD',
    businessStatus: 'accepted', orderDate: new Date('2024-01-15T18:15:00'),
  },
  {
    id: '3', orderId: '3', userId: 'u3',
    customerName: 'Mike Davis', customerEmail: 'mike@example.com',
    venueId: 'v1', venueName: 'Club Nova',
    eventId: 'e1', eventTitle: 'Saturday Night',
    product: 'Weekend VIP Package', quantity: 1, amountTotal: 180, currency: 'USD',
    businessStatus: 'completed', orderDate: new Date('2024-01-15T17:45:00'),
  },
  {
    id: '4', orderId: '4', userId: 'u4',
    customerName: 'Emily Wilson', customerEmail: 'emily@example.com',
    venueId: 'v1', venueName: 'Club Nova',
    eventId: 'e1', eventTitle: 'Saturday Night',
    product: 'General Entry', quantity: 4, amountTotal: 80, currency: 'USD',
    businessStatus: 'rejected', orderDate: new Date('2024-01-15T16:20:00'),
  },
  {
    id: '5', orderId: '5', userId: 'u5',
    customerName: 'David Brown', customerEmail: 'david@example.com',
    venueId: 'v1', venueName: 'Club Nova',
    eventId: 'e1', eventTitle: 'Saturday Night',
    product: 'Bottle Service', quantity: 1, amountTotal: 350, currency: 'USD',
    businessStatus: 'pending', orderDate: new Date('2024-01-15T15:30:00'),
  },
];

// â”€â”€ Status config map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type StatusConfig = {
  label: string;
  icon: (color: string) => React.ReactNode;
  color: string;
};

function useStatusConfig() {
  const { theme } = useTheme();
  const cfg: Record<BusinessStatus, StatusConfig> = {
    pending:   { label: 'Pending',   icon: c => <Clock size={14} color={c} />,       color: theme.colors.warning },
    accepted:  { label: 'Accepted',  icon: c => <CheckCircle size={14} color={c} />, color: theme.colors.success },
    rejected:  { label: 'Rejected',  icon: c => <XCircle size={14} color={c} />,     color: theme.colors.error   },
    completed: { label: 'Completed', icon: c => <CheckCircle size={14} color={c} />, color: theme.colors.cyan    },
    refunded:  { label: 'Refunded',  icon: c => <RotateCcw size={14} color={c} />,   color: theme.colors.text.secondary },
  };
  return cfg;
}

// â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function OrdersScreen() {
  const { theme } = useTheme();
  const statusConfig = useStatusConfig();

  const [orders, setOrders] = useState<VenueOrder[]>(MOCK_ORDERS);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [useMock, setUseMock] = useState(true);

  // â”€â”€ Fetch orders from API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const fetchOrders = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const res = await api.get<{ orders: VenueOrder[] }>('/business/orders');
      setOrders(res.data.orders);
      setUseMock(false);
    } catch {
      // backend unavailable â€“ keep mock data
      setUseMock(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchOrders(false);
  }, [fetchOrders]);

  // â”€â”€ Update order status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const updateStatus = useCallback(async (orderId: string, newStatus: BusinessStatus) => {
    setUpdatingId(orderId);
    try {
      if (!useMock) {
        await api.patch(`/business/orders/${orderId}/status`, { status: newStatus });
      }
      // Optimistically update local state
      setOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, businessStatus: newStatus } : o)
      );
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error ?? 'Failed to update order');
    } finally {
      setUpdatingId(null);
    }
  }, [useMock]);

  const confirmAction = (orderId: string, newStatus: BusinessStatus, label: string) => {
    Alert.alert(
      `${label} Order`,
      `Are you sure you want to ${label.toLowerCase()} this order?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: label, onPress: () => updateStatus(orderId, newStatus), style: newStatus === 'rejected' || newStatus === 'refunded' ? 'destructive' : 'default' },
      ],
    );
  };

  // â”€â”€ Filtering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const FILTER_TABS: { key: FilterTab; label: string }[] = [
    { key: 'all',       label: 'All' },
    { key: 'pending',   label: 'Pending' },
    { key: 'accepted',  label: 'Accepted' },
    { key: 'completed', label: 'Completed' },
    { key: 'rejected',  label: 'Rejected' },
  ];

  const filteredOrders = activeFilter === 'all'
    ? orders
    : orders.filter(o => o.businessStatus === activeFilter);

  // â”€â”€ Aggregates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const totalRevenue = orders
    .filter(o => o.businessStatus === 'completed')
    .reduce((s, o) => s + o.amountTotal, 0);
  const pendingCount  = orders.filter(o => o.businessStatus === 'pending').length;
  const acceptedCount = orders.filter(o => o.businessStatus === 'accepted').length;

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const formatDate = (d: Date | string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const styles = StyleSheet.create({
    container:       { flex: 1, backgroundColor: theme.colors.background },
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    summaryValue: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: 2,
    },
    summaryLabel: {
      fontSize: 11,
      color: theme.colors.text.secondary,
    },
    filterBar: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterChipActive: {
      backgroundColor: theme.colors.purple,
      borderColor: theme.colors.purple,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.text.secondary,
    },
    filterChipTextActive: {
      color: theme.colors.white,
    },
    listContainer: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
    },
    orderCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    orderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.md,
    },
    customerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatarContainer: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: theme.colors.purple,
      justifyContent: 'center', alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    customerDetails: { flex: 1 },
    customerName: {
      fontSize: 16, fontWeight: '600',
      color: theme.colors.text.primary, marginBottom: 2,
    },
    orderDate: { fontSize: 12, color: theme.colors.text.secondary },
    orderPrice: { alignItems: 'flex-end' },
    priceText: { fontSize: 18, fontWeight: '700', color: theme.colors.text.primary },
    qtyText: { fontSize: 12, color: theme.colors.text.secondary },
    orderBody: { marginBottom: theme.spacing.md },
    productInfo: { flexDirection: 'row', alignItems: 'center' },
    productIcon: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: `${theme.colors.purple}20`,
      justifyContent: 'center', alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    productDetails: { flex: 1 },
    productName: {
      fontSize: 15, fontWeight: '500',
      color: theme.colors.text.primary, marginBottom: 2,
    },
    eventTitle: { fontSize: 12, color: theme.colors.text.secondary },
    orderFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    statusBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: theme.borderRadius.full,
    },
    statusText: { fontSize: 12, fontWeight: '600' },
    actionRow: { flexDirection: 'row', gap: theme.spacing.sm },
    actionBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: theme.borderRadius.sm,
    },
    actionBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.white },
    emptyState: {
      flex: 1, justifyContent: 'center', alignItems: 'center',
      paddingVertical: theme.spacing.xxl,
    },
    emptyIcon: { marginBottom: theme.spacing.lg },
    emptyTitle: {
      fontSize: 20, fontWeight: '600',
      color: theme.colors.text.primary, marginBottom: theme.spacing.sm,
    },
    emptyDescription: {
      fontSize: 15, color: theme.colors.text.secondary,
      textAlign: 'center', lineHeight: 22,
      paddingHorizontal: theme.spacing.xl,
    },
    mockBanner: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, backgroundColor: `${theme.colors.warning}20`,
      paddingVertical: 6, paddingHorizontal: theme.spacing.lg,
      marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
    },
    mockBannerText: { fontSize: 11, color: theme.colors.warning, fontWeight: '500' },
  });

  const renderOrderCard = ({ item }: { item: VenueOrder }) => {
    const cfg = statusConfig[item.businessStatus];
    const isBusy = updatingId === item.id;

    return (
      <View style={styles.orderCard} testID={`order-card-${item.id}`}>

        {/* Header */}
        <View style={styles.orderHeader}>
          <View style={styles.customerInfo}>
            <View style={styles.avatarContainer}>
              <User size={20} color={theme.colors.white} />
            </View>
            <View style={styles.customerDetails}>
              <Text style={styles.customerName}>{item.customerName}</Text>
              <Text style={styles.orderDate}>{formatDate(item.orderDate)}</Text>
            </View>
          </View>
          <View style={styles.orderPrice}>
            <Text style={styles.priceText}>${item.amountTotal.toFixed(2)}</Text>
            <Text style={styles.qtyText}>Ã—{item.quantity}</Text>
          </View>
        </View>

        {/* Product */}
        <View style={styles.orderBody}>
          <View style={styles.productInfo}>
            <View style={styles.productIcon}>
              <Package size={16} color={theme.colors.purple} />
            </View>
            <View style={styles.productDetails}>
              <Text style={styles.productName}>{item.product}</Text>
              <Text style={styles.eventTitle}>{item.eventTitle}</Text>
            </View>
          </View>
        </View>

        {/* Footer: status badge + action buttons */}
        <View style={styles.orderFooter}>
          {/* Current status */}
          <View style={[styles.statusBadge, { backgroundColor: `${cfg.color}20` }]}>
            {cfg.icon(cfg.color)}
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>

          {/* Contextual action buttons */}
          {isBusy
            ? <ActivityIndicator color={theme.colors.purple} />
            : (
              <View style={styles.actionRow}>
                {item.businessStatus === 'pending' && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: theme.colors.success }]}
                      onPress={() => updateStatus(item.id, 'accepted')}
                      testID={`accept-btn-${item.id}`}
                    >
                      <CheckCircle size={14} color={theme.colors.white} />
                      <Text style={styles.actionBtnText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: theme.colors.error }]}
                      onPress={() => confirmAction(item.id, 'rejected', 'Reject')}
                      testID={`reject-btn-${item.id}`}
                    >
                      <XCircle size={14} color={theme.colors.white} />
                      <Text style={styles.actionBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </>
                )}
                {item.businessStatus === 'accepted' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: theme.colors.cyan }]}
                    onPress={() => updateStatus(item.id, 'completed')}
                    testID={`complete-btn-${item.id}`}
                  >
                    <CheckCircle size={14} color={theme.colors.white} />
                    <Text style={styles.actionBtnText}>Complete</Text>
                  </TouchableOpacity>
                )}
                {item.businessStatus === 'completed' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: `${theme.colors.text.secondary}30` }]}
                    onPress={() => confirmAction(item.id, 'refunded', 'Refund')}
                    testID={`refund-btn-${item.id}`}
                  >
                    <RotateCcw size={14} color={theme.colors.text.secondary} />
                    <Text style={[styles.actionBtnText, { color: theme.colors.text.secondary }]}>Refund</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          }
        </View>
      </View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <ShoppingCart size={64} color={theme.colors.text.tertiary} />
      </View>
      <Text style={styles.emptyTitle}>No orders {activeFilter !== 'all' ? `(${activeFilter})` : ''}</Text>
      <Text style={styles.emptyDescription}>
        {activeFilter === 'all'
          ? 'Orders from customers will appear here once you publish events and offers.'
          : `No ${activeFilter} orders at the moment.`}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={theme.colors.purple} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Summary row */}
      <View style={styles.header}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{orders.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: theme.colors.warning }]}>{pendingCount}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: theme.colors.success }]}>{acceptedCount}</Text>
            <Text style={styles.summaryLabel}>Accepted</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: theme.colors.cyan }]}>
              ${totalRevenue.toFixed(0)}
            </Text>
            <Text style={styles.summaryLabel}>Revenue</Text>
          </View>
        </View>
      </View>

      {/* Mock data banner */}
      {useMock && (
        <View style={styles.mockBanner}>
          <RefreshCw size={12} color={theme.colors.warning} />
          <Text style={styles.mockBannerText}>Showing demo data â€“ connect backend for live orders</Text>
        </View>
      )}

      {/* Filter tabs */}
      <FlatList
        horizontal
        data={FILTER_TABS}
        keyExtractor={t => t.key}
        contentContainerStyle={styles.filterBar}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item: tab }) => (
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === tab.key && styles.filterChipActive]}
            onPress={() => setActiveFilter(tab.key)}
            testID={`filter-${tab.key}`}
          >
            <Text style={[styles.filterChipText, activeFilter === tab.key && styles.filterChipTextActive]}>
              {tab.label}
              {tab.key === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Order list */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderCard}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContainer, { paddingBottom: 32 }]}
        ListEmptyComponent={<EmptyState />}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.purple}
          />
        }
      />
    </View>
  );
}
