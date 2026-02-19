import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/hooks/theme-context';
import { 
  ShoppingCart, 
  User,
  DollarSign,
  ChevronDown,
  Package,
} from 'lucide-react-native';

interface OrderItem {
  id: string;
  customerName: string;
  product: string;
  quantity: number;
  price: number;
  status: 'pending' | 'completed';
  orderDate: Date;
  customerAvatar?: string;
}

const mockOrders: OrderItem[] = [
  {
    id: '1',
    customerName: 'John Smith',
    product: 'VIP Table Booking',
    quantity: 1,
    price: 250,
    status: 'pending',
    orderDate: new Date('2024-01-15T19:30:00'),
  },
  {
    id: '2',
    customerName: 'Sarah Johnson',
    product: 'Happy Hour Special',
    quantity: 2,
    price: 45,
    status: 'completed',
    orderDate: new Date('2024-01-15T18:15:00'),
  },
  {
    id: '3',
    customerName: 'Mike Davis',
    product: 'Weekend VIP Package',
    quantity: 1,
    price: 180,
    status: 'pending',
    orderDate: new Date('2024-01-15T17:45:00'),
  },
  {
    id: '4',
    customerName: 'Emily Wilson',
    product: 'General Entry',
    quantity: 4,
    price: 80,
    status: 'completed',
    orderDate: new Date('2024-01-15T16:20:00'),
  },
  {
    id: '5',
    customerName: 'David Brown',
    product: 'Bottle Service',
    quantity: 1,
    price: 350,
    status: 'pending',
    orderDate: new Date('2024-01-15T15:30:00'),
  },
];

type OrderStatus = 'pending' | 'completed';

export default function OrdersScreen() {
  const { theme } = useTheme();
  const [orders, setOrders] = useState<OrderItem[]>(mockOrders);

  const updateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return theme.colors.warning;
      case 'completed':
        return theme.colors.success;
      default:
        return theme.colors.text.secondary;
    }
  };

  const renderOrderCard = ({ item }: { item: OrderItem }) => (
    <View style={styles.orderCard} testID={`order-card-${item.id}`}>
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
          <Text style={styles.priceText}>{formatPrice(item.price)}</Text>
        </View>
      </View>

      <View style={styles.orderBody}>
        <View style={styles.productInfo}>
          <View style={styles.productIcon}>
            <Package size={16} color={theme.colors.purple} />
          </View>
          <View style={styles.productDetails}>
            <Text style={styles.productName}>{item.product}</Text>
            <Text style={styles.productQuantity}>Quantity: {item.quantity}</Text>
          </View>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.statusDropdown}
          onPress={() => {
            const newStatus = item.status === 'pending' ? 'completed' : 'pending';
            updateOrderStatus(item.id, newStatus);
          }}
          testID={`status-dropdown-${item.id}`}
        >
          <Text style={styles.dropdownText}>Change Status</Text>
          <ChevronDown size={16} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <ShoppingCart size={64} color={theme.colors.text.tertiary} />
      </View>
      <Text style={styles.emptyTitle}>No orders yet</Text>
      <Text style={styles.emptyDescription}>
        Orders from customers will appear here. Start promoting your offers and events to get your first orders!
      </Text>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    listContainer: {
      flex: 1,
      padding: theme.spacing.lg,
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
    customerInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    avatarContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.purple,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    customerDetails: {
      flex: 1,
    },
    customerName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginBottom: 2,
    },
    orderDate: {
      fontSize: 14,
      color: theme.colors.text.secondary,
    },
    orderPrice: {
      alignItems: 'flex-end',
    },
    priceText: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text.primary,
    },
    orderBody: {
      marginBottom: theme.spacing.md,
    },
    productInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    productIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: `${theme.colors.purple}20`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    productDetails: {
      flex: 1,
    },
    productName: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text.primary,
      marginBottom: 2,
    },
    productQuantity: {
      fontSize: 14,
      color: theme.colors.text.secondary,
    },
    orderFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: theme.spacing.sm,
    },
    statusText: {
      fontSize: 14,
      fontWeight: '500',
    },
    statusDropdown: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    dropdownText: {
      fontSize: 14,
      color: theme.colors.text.primary,
      marginRight: theme.spacing.sm,
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
      paddingHorizontal: theme.spacing.xl,
    },
    summaryContainer: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    summaryItem: {
      alignItems: 'center',
    },
    summaryValue: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: 4,
    },
    summaryLabel: {
      fontSize: 14,
      color: theme.colors.text.secondary,
    },
  });

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(order => order.status === 'pending').length;
  const totalRevenue = orders
    .filter(order => order.status === 'completed')
    .reduce((sum, order) => sum + order.price, 0);

  return (
    <View style={styles.container}>
      <View style={styles.listContainer}>
        {orders.length > 0 ? (
          <>
            <View style={styles.summaryContainer}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{totalOrders}</Text>
                <Text style={styles.summaryLabel}>Total Orders</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{pendingOrders}</Text>
                <Text style={styles.summaryLabel}>Pending</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>${totalRevenue}</Text>
                <Text style={styles.summaryLabel}>Revenue</Text>
              </View>
            </View>
            
            <FlatList
              data={orders}
              renderItem={renderOrderCard}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
            />
          </>
        ) : (
          <EmptyState />
        )}
      </View>
    </View>
  );
}