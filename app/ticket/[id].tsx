import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Calendar, MapPin, Clock, User, QrCode } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useTickets } from '@/hooks/tickets-context';
import { useLocalSearchParams, router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';

const { width } = Dimensions.get('window');

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams();
  const { tickets } = useTickets();
  const [showQR, setShowQR] = useState(false);

  const ticket = tickets.find(t => t.id === id);

  if (!ticket) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Ticket not found</Text>
      </SafeAreaView>
    );
  }

  const handleClose = () => {
    router.back();
  };

  const getStatusColor = () => {
    switch (ticket.status) {
      case 'valid':
        return theme.colors.success;
      case 'used':
        return theme.colors.gray[600];
      case 'refunded':
        return theme.colors.error;
      default:
        return theme.colors.gray[500];
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={[theme.colors.purple, theme.colors.cyan]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={theme.colors.white} />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.eventTitle}>{ticket.eventTitle}</Text>
            <Text style={styles.venueName}>{ticket.venueName}</Text>
            
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.statusText}>{ticket.status.toUpperCase()}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Ticket Details */}
        <View style={styles.content}>
          <View style={styles.detailsSection}>
            <View style={styles.detailItem}>
              <Calendar size={20} color={theme.colors.text.secondary} />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Event Date</Text>
                <Text style={styles.detailValue}>
                  {new Date(ticket.eventDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <MapPin size={20} color={theme.colors.text.secondary} />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Venue</Text>
                <Text style={styles.detailValue}>{ticket.venueName}</Text>
                <Text style={styles.detailSubvalue}>{ticket.venueAddress}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <User size={20} color={theme.colors.text.secondary} />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Ticket Type</Text>
                <Text style={styles.detailValue}>{ticket.productName}</Text>
              </View>
            </View>

            {ticket.checkedInAt && (
              <View style={styles.detailItem}>
                <Clock size={20} color={theme.colors.text.secondary} />
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Checked In</Text>
                  <Text style={styles.detailValue}>
                    {new Date(ticket.checkedInAt).toLocaleString()}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* QR Code Section */}
          <View style={styles.qrSection}>
            <Text style={styles.qrTitle}>Entry QR Code</Text>
            <Text style={styles.qrSubtitle}>
              Show this code at the venue entrance
            </Text>
            
            <TouchableOpacity
              style={styles.qrContainer}
              onPress={() => setShowQR(!showQR)}
            >
              {showQR ? (
                <View style={styles.qrCodeWrapper}>
                  <QRCode
                    value={ticket.qrCode}
                    size={200}
                    backgroundColor={theme.colors.white}
                    color={theme.colors.background}
                  />
                </View>
              ) : (
                <View style={styles.qrPlaceholder}>
                  <QrCode size={64} color={theme.colors.text.tertiary} />
                  <Text style={styles.qrPlaceholderText}>Tap to show QR code</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <Text style={styles.ticketId}>Ticket ID: {ticket.id}</Text>
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>Entry Instructions</Text>
            <Text style={styles.instructionsText}>
              • Arrive at the venue with this ticket ready
            </Text>
            <Text style={styles.instructionsText}>
              • Show the QR code to security at the entrance
            </Text>
            <Text style={styles.instructionsText}>
              • Keep your phone charged and brightness up
            </Text>
            <Text style={styles.instructionsText}>
              • Have a valid ID ready for age verification
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing.lg,
    right: theme.spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.white,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  venueName: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
  },
  statusText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    padding: theme.spacing.lg,
  },
  detailsSection: {
    marginBottom: theme.spacing.xl,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  detailSubvalue: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  qrSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  qrContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 240,
    width: width - 48,
  },
  qrCodeWrapper: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  qrPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholderText: {
    fontSize: 16,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.md,
  },
  ticketId: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    fontFamily: 'monospace',
  },
  instructions: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  instructionsText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  errorText: {
    color: theme.colors.text.primary,
    fontSize: 18,
    textAlign: 'center',
    marginTop: theme.spacing.xxl,
  },
});