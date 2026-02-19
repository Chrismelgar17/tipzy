import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { QrCode, Calendar, MapPin } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useTickets } from '@/hooks/tickets-context';
import { router } from 'expo-router';

export default function WalletScreen() {
  const { tickets } = useTickets();

  const handleTicketPress = (ticketId: string) => {
    router.push({
      pathname: '/ticket/[id]' as any,
      params: { id: ticketId },
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>My Tickets</Text>
        <Text style={styles.subtitle}>{tickets.length} tickets</Text>
      </View>

      <View style={styles.ticketList}>
        {tickets.map((ticket) => (
          <TouchableOpacity
            key={ticket.id}
            style={styles.ticketCard}
            onPress={() => handleTicketPress(ticket.id)}
          >
            <View style={styles.ticketHeader}>
              <Text style={styles.eventTitle}>{ticket.eventTitle}</Text>
              <View style={[styles.statusBadge, 
                ticket.status === 'valid' && styles.statusValid,
                ticket.status === 'used' && styles.statusUsed,
                ticket.status === 'refunded' && styles.statusRefunded,
              ]}>
                <Text style={styles.statusText}>{ticket.status.toUpperCase()}</Text>
              </View>
            </View>
            
            <Text style={styles.venueName}>{ticket.venueName}</Text>
            
            <View style={styles.ticketInfo}>
              <View style={styles.infoItem}>
                <Calendar size={16} color={theme.colors.text.secondary} />
                <Text style={styles.infoText}>
                  {new Date(ticket.eventDate).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <MapPin size={16} color={theme.colors.text.secondary} />
                <Text style={styles.infoText}>{ticket.venueAddress}</Text>
              </View>
            </View>
            
            <View style={styles.ticketFooter}>
              <Text style={styles.productName}>{ticket.productName}</Text>
              <QrCode size={24} color={theme.colors.purple} />
            </View>
          </TouchableOpacity>
        ))}
        
        {tickets.length === 0 && (
          <View style={styles.emptyState}>
            <QrCode size={64} color={theme.colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No Tickets Yet</Text>
            <Text style={styles.emptySubtitle}>
              Your purchased tickets will appear here
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  ticketList: {
    padding: theme.spacing.lg,
  },
  ticketCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusValid: {
    backgroundColor: theme.colors.success,
  },
  statusUsed: {
    backgroundColor: theme.colors.gray[600],
  },
  statusRefunded: {
    backgroundColor: theme.colors.error,
  },
  statusText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  venueName: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  ticketInfo: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.purple,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
});