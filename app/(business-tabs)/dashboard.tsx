import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/hooks/theme-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Eye, 
  BarChart3,
  Calendar,
  Users,
  UserPlus,
  UserMinus,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react-native';
import { useAuth } from '@/hooks/auth-context';
import { useCapacity, CROWD_COLOR_HEX, crowdColorLabel } from '@/hooks/capacity-context';
import { BusinessDashboardStats } from '@/types/models';
import api from '@/lib/api';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

type ChartType = 'views';

const FALLBACK_CHART = [
  { label: 'Mon', value: 450 },
  { label: 'Tue', value: 320 },
  { label: 'Wed', value: 580 },
  { label: 'Thu', value: 720 },
  { label: 'Fri', value: 890 },
  { label: 'Sat', value: 1200 },
  { label: 'Sun', value: 980 },
];

export default function BusinessDashboard() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { capacity, isLoading, isUpdating, isPolling, lastUpdated, checkIn, checkOut, setVenueId, error, refresh } = useCapacity();

  const [selectedChart, setSelectedChart] = useState<ChartType>('views');
  const [stats, setStats] = useState<BusinessDashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [venueIdResolved, setVenueIdResolved] = useState<string | null>(null);
  const [selectedBar, setSelectedBar] = useState<{ label: string; value: number; index: number } | null>(null);
  const [ownedVenues, setOwnedVenues] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  // when user picks a different venue from the pill picker, switch capacity tracking
  useEffect(() => {
    if (selectedVenueId) setVenueId(selectedVenueId);
  }, [selectedVenueId]);

  // â”€â”€ fetch owned venue & stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const loadDashboard = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [dashRes, venuesRes] = await Promise.all([
        api.get<any>('/business/dashboard'),
        api.get<any>('/business/venues').catch(() => ({ data: { venues: [] } })),
      ]);
      const data = dashRes.data;
      setStats(data);
      const venues: Array<{ id: string; name: string }> = venuesRes.data?.venues ?? [];
      setOwnedVenues(venues);
      if (data.venueId && !venueIdResolved) {
        setVenueIdResolved(data.venueId);
        setSelectedVenueId(data.venueId);
        setVenueId(data.venueId);
      }
    } catch (err) {
      // backend not available â€“ capacity context will show mock via fallback
    } finally {
      setStatsLoading(false);
    }
  }, [setVenueId, venueIdResolved]);

  useEffect(() => {
    loadDashboard();
  }, []);

  // â”€â”€ derived values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const currentCount = capacity?.currentCount ?? 0;
  const maxCapacity   = capacity?.maxCapacity  ?? 200;
  const occupancyPct  = capacity?.occupancyPct ?? Math.round((currentCount / maxCapacity) * 100);
  const crowdColor    = capacity?.crowdColor   ?? 'green';
  const crowdHex      = CROWD_COLOR_HEX[crowdColor];
  const crowdLabel    = crowdColorLabel(crowdColor);

  const isAtCapacity = currentCount >= maxCapacity;
  const isEmpty      = currentCount <= 0;

  const handlePersonIn = async () => {
    if (isAtCapacity) {
      Alert.alert('At Capacity', 'Your venue is at maximum capacity.');
      return;
    }
    await checkIn();
    if (error) Alert.alert('Error', error);
  };

  const handlePersonOut = async () => {
    if (isEmpty) return;
    await checkOut();
    if (error) Alert.alert('Error', error);
  };

  const getChartData = () => {
    const chart = (stats as any)?.weeklyViewsChart;
    if (chart && chart.length > 0) return chart;
    return FALLBACK_CHART.map((item: any) => ({ ...item, value: 0 }));
  };

  const maxValue = Math.max(...getChartData().map(item => item.value));

  const formattedLastUpdated = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    summaryContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    summaryCard: {
      flex: 1,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    summaryGradient: {
      padding: theme.spacing.md,
      alignItems: 'center',
      minHeight: 100,
      justifyContent: 'center',
    },
    summaryIcon: {
      marginBottom: theme.spacing.sm,
    },
    summaryValue: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.white,
      marginBottom: 4,
    },
    summaryLabel: {
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.9)',
      textAlign: 'center',
    },
    capacitySection: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    capacityHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    capacityTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    capacityTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text.primary,
    },
    pollingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.success,
    },
    pollingDotOff: {
      backgroundColor: theme.colors.text.tertiary,
    },
    capacityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.borderRadius.full,
      gap: 6,
    },
    crowdDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    capacityBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.white,
    },
    capacityDisplay: {
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    capacityCount: {
      fontSize: 56,
      fontWeight: '800',
      marginBottom: 4,
    },
    capacityLabel: {
      fontSize: 14,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.md,
    },
    capacityBar: {
      width: '100%',
      height: 10,
      backgroundColor: theme.colors.background,
      borderRadius: 5,
      overflow: 'hidden',
      marginBottom: theme.spacing.sm,
    },
    capacityFill: {
      height: '100%',
      borderRadius: 5,
    },
    capacityPct: {
      fontSize: 12,
      color: theme.colors.text.secondary,
      textAlign: 'right',
      width: '100%',
      marginBottom: theme.spacing.lg,
    },
    capacityButtons: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    capacityButton: {
      flex: 1,
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
    },
    capacityButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      gap: 8,
    },
    capacityButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.white,
    },
    capacityButtonDisabled: {
      opacity: 0.4,
    },
    lastUpdatedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.sm,
      gap: 6,
    },
    lastUpdatedText: {
      fontSize: 11,
      color: theme.colors.text.tertiary,
    },
    refreshBtn: {
      padding: 4,
    },
    chartSection: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    chartHeader: {
      marginBottom: theme.spacing.lg,
    },
    chartTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.md,
    },
    chartToggle: {
      flexDirection: 'row',
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      padding: 4,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.sm,
      alignItems: 'center',
    },
    toggleButtonActive: {
      backgroundColor: theme.colors.purple,
    },
    toggleText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text.secondary,
    },
    toggleTextActive: {
      color: theme.colors.white,
    },
    chartContainer: {
      height: 200,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.sm,
    },
    chartBarCol: {
      alignItems: 'center',
      width: (width - theme.spacing.lg * 2 - theme.spacing.lg * 2 - theme.spacing.sm * 2) / 7,
    },
    chartBar: {
      width: (width - theme.spacing.lg * 2 - theme.spacing.lg * 2 - theme.spacing.sm * 2) / 7 - 8,
      backgroundColor: theme.colors.purple,
      borderRadius: 4,
    },
    chartTooltip: {
      backgroundColor: theme.colors.card,
      borderRadius: 6,
      paddingHorizontal: 5,
      paddingVertical: 4,
      marginBottom: 4,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: `${theme.colors.purple}50`,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 3,
      elevation: 4,
    },
    chartTooltipLabel: {
      fontSize: 9,
      fontWeight: '500',
      color: theme.colors.text.secondary,
    },
    chartTooltipValue: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.purple,
    },
    chartLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    chartLabel: {
      fontSize: 12,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      width: (width - theme.spacing.lg * 2 - theme.spacing.lg * 2 - theme.spacing.sm * 2) / 7,
    },
    statsRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.xl,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    statValue: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: 2,
    },
    statLabel: {
      fontSize: 11,
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
    pendingBadge: {
      backgroundColor: `${theme.colors.warning}20`,
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: 8,
      paddingVertical: 2,
      marginTop: 4,
    },
    pendingBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.warning,
    },
    quickActions: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
    },
    quickActionsTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.lg,
    },
    actionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
    },
    actionButton: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    actionIcon: {
      marginBottom: theme.spacing.sm,
    },
    actionText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
    venuePicker: {
      marginBottom: theme.spacing.lg,
    },
    venuePickerContent: {
      gap: theme.spacing.sm,
      paddingBottom: 2,
    },
    venuePill: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    venuePillActive: {
      backgroundColor: theme.colors.purple,
      borderColor: theme.colors.purple,
    },
    venuePillText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text.secondary,
    },
    venuePillTextActive: {
      color: theme.colors.white,
      fontWeight: '600',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.scrollContent}>

          {/* ── Venue picker (only when owner has >1 venue) ────────────────── */}
          {ownedVenues.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.venuePicker}
              contentContainerStyle={styles.venuePickerContent}
            >
              {ownedVenues.map((v) => {
                const isActive = v.id === selectedVenueId;
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.venuePill, isActive && styles.venuePillActive]}
                    onPress={() => setSelectedVenueId(v.id)}
                  >
                    <Text style={[styles.venuePillText, isActive && styles.venuePillTextActive]}>
                      {v.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* â”€â”€ Summary cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <View style={styles.summaryContainer}>
            <TouchableOpacity style={[styles.summaryCard, { flex: 0, width: '100%' }]}>
              <LinearGradient
                colors={[theme.colors.success, '#4ECDC4']}
                style={[styles.summaryGradient, { flexDirection: 'row', gap: 16, justifyContent: 'center', minHeight: 80 }]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <View style={styles.summaryIcon}>
                  <Eye size={28} color={theme.colors.white} />
                </View>
                <View style={{ justifyContent: 'center' }}>
                  <Text style={[styles.summaryValue, { fontSize: 28 }]}>
                    {statsLoading ? '–' : stats?.weeklyViews ?? 0}
                  </Text>
                  <Text style={styles.summaryLabel}>Weekly Views</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.capacitySection}>
            <View style={styles.capacityHeader}>
              <View style={styles.capacityTitleRow}>
                <Text style={styles.capacityTitle}>Live Capacity</Text>
                {/* Pulse dot: green = polling active, grey = offline */}
                <View style={[styles.pollingDot, !isPolling && styles.pollingDotOff]} />
              </View>

              {/* Traffic-light crowd badge */}
              <View style={[styles.capacityBadge, { backgroundColor: crowdHex }]}>
                <View style={[styles.crowdDot, { backgroundColor: 'rgba(255,255,255,0.6)' }]} />
                <Text style={styles.capacityBadgeText}>{crowdLabel}</Text>
              </View>
            </View>

            {isLoading ? (
              <ActivityIndicator color={theme.colors.purple} style={{ marginVertical: 24 }} />
            ) : (
              <>
                <View style={styles.capacityDisplay}>
                  <Text style={[styles.capacityCount, { color: crowdHex }]}>
                    {currentCount}
                  </Text>
                  <Text style={styles.capacityLabel}>
                    {currentCount} / {maxCapacity} guests
                  </Text>

                  {/* Progress bar */}
                  <View style={styles.capacityBar}>
                    <LinearGradient
                      colors={[crowdHex, crowdHex]}
                      style={[styles.capacityFill, { width: `${Math.min(occupancyPct, 100)}%` }]}
                    />
                  </View>
                  <Text style={styles.capacityPct}>{occupancyPct}% full</Text>
                </View>

                {/* Check-in / Check-out buttons */}
                <View style={styles.capacityButtons}>
                  <TouchableOpacity
                    style={[styles.capacityButton, isEmpty && styles.capacityButtonDisabled]}
                    onPress={handlePersonOut}
                    disabled={isEmpty || isUpdating}
                    testID="person-out-button"
                  >
                    <LinearGradient
                      colors={[theme.colors.error, '#FF6B6B']}
                      style={styles.capacityButtonGradient}
                    >
                      {isUpdating
                        ? <ActivityIndicator color={theme.colors.white} size="small" />
                        : <UserMinus size={20} color={theme.colors.white} />}
                      <Text style={styles.capacityButtonText}>Out</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.capacityButton, isAtCapacity && styles.capacityButtonDisabled]}
                    onPress={handlePersonIn}
                    disabled={isAtCapacity || isUpdating}
                    testID="person-in-button"
                  >
                    <LinearGradient
                      colors={[theme.colors.success, '#4ECDC4']}
                      style={styles.capacityButtonGradient}
                    >
                      {isUpdating
                        ? <ActivityIndicator color={theme.colors.white} size="small" />
                        : <UserPlus size={20} color={theme.colors.white} />}
                      <Text style={styles.capacityButtonText}>In</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Last-updated timestamp + manual refresh */}
            <View style={styles.lastUpdatedRow}>
              {isPolling
                ? <Wifi size={12} color={theme.colors.success} />
                : <WifiOff size={12} color={theme.colors.text.tertiary} />}
              <Text style={styles.lastUpdatedText}>
                {formattedLastUpdated ? `Updated ${formattedLastUpdated}` : 'Not yet synced'}
              </Text>
              <TouchableOpacity style={styles.refreshBtn} onPress={refresh}>
                <RefreshCw size={12} color={theme.colors.text.tertiary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* â”€â”€ Analytics chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <View style={styles.chartSection}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Weekly Views</Text>
            </View>

            <View style={styles.chartContainer}>
              {getChartData().map((item, index) => {
                const barHeight = maxValue > 0 ? (item.value / maxValue) * 160 : 4;
                const isSelected = selectedBar?.index === index;
                return (
                  <View key={index} style={styles.chartBarCol}>
                    {isSelected && (
                      <View style={styles.chartTooltip}>
                        <Text style={styles.chartTooltipLabel}>{item.label}</Text>
                        <Text style={styles.chartTooltipValue}>{item.value}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[styles.chartBar, {
                        height: barHeight,
                        backgroundColor: isSelected ? theme.colors.purpleLight ?? `${theme.colors.purple}bb` : theme.colors.purple,
                      }]}
                      onPress={() => setSelectedBar(isSelected ? null : { label: item.label, value: item.value, index })}
                      activeOpacity={0.75}
                    />
                  </View>
                );
              })}
            </View>
            <View style={styles.chartLabels}>
              {getChartData().map((item, index) => (
                <Text key={index} style={styles.chartLabel}>{item.label}</Text>
              ))}
            </View>
          </View>

          {/* â”€â”€ Quick actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <View style={styles.quickActions}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionButton} testID="create-offer-action" onPress={() => router.push('/(business-tabs)/add')}>
                <View style={styles.actionIcon}>
                  <BarChart3 size={24} color={theme.colors.purple} />
                </View>
                <Text style={styles.actionText}>Create Offer</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} testID="create-event-action" onPress={() => router.push('/(business-tabs)/add')}>
                <View style={styles.actionIcon}>
                  <Calendar size={24} color={theme.colors.cyan} />
                </View>
                <Text style={styles.actionText}>Create Event</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} testID="view-customers-action" onPress={() => router.push('/(business-tabs)/orders')}>
                <View style={styles.actionIcon}>
                  <Users size={24} color={theme.colors.success} />
                </View>
                <Text style={styles.actionText}>View Customers</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} testID="analytics-action" onPress={() => { setSelectedBar(null); }}>
                <View style={styles.actionIcon}>
                  <Eye size={24} color={theme.colors.warning} />
                </View>
                <Text style={styles.actionText}>Analytics</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
