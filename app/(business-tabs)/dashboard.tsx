import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Alert,
} from 'react-native';
import { useTheme } from '@/hooks/theme-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  DollarSign, 
  TrendingUp, 
  Eye, 
  BarChart3,
  Calendar,
  Users,
  UserPlus,
  UserMinus,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BusinessProfile } from '@/types/models';
import { safeJsonParse, clearCorruptedData } from '@/utils/storage';

const { width } = Dimensions.get('window');

interface DashboardData {
  weeklySales: number;
  weeklyIncome: number;
  weeklyViews: number;
  chartData: { label: string; value: number }[];
  currentCount: number;
  maxCapacity: number;
}

const mockData: DashboardData = {
  weeklySales: 127,
  weeklyIncome: 3450,
  weeklyViews: 2890,
  currentCount: 85,
  maxCapacity: 200, // This will be overridden by business profile data
  chartData: [
    { label: 'Mon', value: 450 },
    { label: 'Tue', value: 320 },
    { label: 'Wed', value: 580 },
    { label: 'Thu', value: 720 },
    { label: 'Fri', value: 890 },
    { label: 'Sat', value: 1200 },
    { label: 'Sun', value: 980 },
  ],
};

type ChartType = 'sales' | 'income' | 'views';

export default function BusinessDashboard() {
  const { theme } = useTheme();
  const [selectedChart, setSelectedChart] = useState<ChartType>('sales');
  const [currentCount, setCurrentCount] = useState<number>(mockData.currentCount);
  const [maxCapacity, setMaxCapacity] = useState<number>(mockData.maxCapacity);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);

  useEffect(() => {
    loadBusinessProfile();
  }, []);

  const loadBusinessProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem('businessProfile');
      const profile = safeJsonParse<BusinessProfile | null>(stored, null);
      
      if (profile && typeof profile === 'object' && profile.businessName) {
        setBusinessProfile(profile);
        setMaxCapacity(profile.maxCapacity);
        setCurrentCount(profile.currentCount || 0);
        console.log('Loaded business profile with capacity:', profile.maxCapacity);
      } else if (stored && stored.trim()) {
        console.warn('Invalid business profile format, using default capacity');
        await clearCorruptedData('businessProfile');
      } else {
        console.log('No business profile found, using default capacity');
      }
    } catch (error) {
      console.error('Failed to load business profile:', error);
    }
  };

  const saveCapacityCount = async (newCount: number) => {
    if (businessProfile) {
      try {
        const updatedProfile = { ...businessProfile, currentCount: newCount };
        await AsyncStorage.setItem('businessProfile', JSON.stringify(updatedProfile));
        setBusinessProfile(updatedProfile);
        console.log('Saved current count:', newCount);
      } catch (error) {
        console.error('Failed to save capacity count:', error);
      }
    }
  };

  const handlePersonIn = () => {
    if (currentCount >= maxCapacity) {
      Alert.alert('Capacity Reached', 'Your venue is at maximum capacity.');
      return;
    }
    const newCount = currentCount + 1;
    setCurrentCount(newCount);
    saveCapacityCount(newCount);
  };

  const handlePersonOut = () => {
    if (currentCount <= 0) {
      return;
    }
    const newCount = currentCount - 1;
    setCurrentCount(newCount);
    saveCapacityCount(newCount);
  };

  const getCapacityPercentage = () => {
    return (currentCount / maxCapacity) * 100;
  };

  const getCapacityStatus = () => {
    const percentage = getCapacityPercentage();
    if (percentage <= 60) return { status: 'Quiet', color: theme.colors.success };
    if (percentage <= 85) return { status: 'Busy', color: theme.colors.warning };
    return { status: 'Full', color: theme.colors.error };
  };

  const getChartData = () => {
    switch (selectedChart) {
      case 'income':
        return mockData.chartData.map(item => ({ ...item, value: item.value * 2.5 }));
      case 'views':
        return mockData.chartData.map(item => ({ ...item, value: item.value * 0.8 }));
      default:
        return mockData.chartData;
    }
  };

  const maxValue = Math.max(...getChartData().map(item => item.value));

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
    chartBar: {
      width: (width - theme.spacing.lg * 2 - theme.spacing.lg * 2 - theme.spacing.sm * 2) / 7 - 8,
      backgroundColor: theme.colors.purple,
      borderRadius: 4,
      marginHorizontal: 4,
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
    capacityTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text.primary,
    },
    capacityStatus: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.borderRadius.full,
    },
    capacityStatusText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.white,
    },
    capacityDisplay: {
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    capacityCount: {
      fontSize: 48,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: 8,
    },
    capacityLabel: {
      fontSize: 16,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.md,
    },
    capacityBar: {
      width: '100%',
      height: 8,
      backgroundColor: theme.colors.background,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: theme.spacing.lg,
    },
    capacityFill: {
      height: '100%',
      borderRadius: 4,
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
      opacity: 0.5,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.scrollContent}>
          <View style={styles.summaryContainer}>
            <TouchableOpacity style={styles.summaryCard} testID="weekly-sales-card">
              <LinearGradient
                colors={[theme.colors.purple, theme.colors.purpleLight]}
                style={styles.summaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.summaryIcon}>
                  <DollarSign size={24} color={theme.colors.white} />
                </View>
                <Text style={styles.summaryValue}>{mockData.weeklySales}</Text>
                <Text style={styles.summaryLabel}>Weekly{'\n'}Sales</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.summaryCard} testID="weekly-income-card">
              <LinearGradient
                colors={[theme.colors.cyan, theme.colors.cyanLight]}
                style={styles.summaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.summaryIcon}>
                  <TrendingUp size={24} color={theme.colors.white} />
                </View>
                <Text style={styles.summaryValue}>${mockData.weeklyIncome}</Text>
                <Text style={styles.summaryLabel}>Weekly{'\n'}Income</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.summaryCard} testID="weekly-views-card">
              <LinearGradient
                colors={[theme.colors.success, '#4ECDC4']}
                style={styles.summaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.summaryIcon}>
                  <Eye size={24} color={theme.colors.white} />
                </View>
                <Text style={styles.summaryValue}>{mockData.weeklyViews}</Text>
                <Text style={styles.summaryLabel}>Weekly{'\n'}Views</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.capacitySection}>
            <View style={styles.capacityHeader}>
              <Text style={styles.capacityTitle}>Live Capacity</Text>
              <View style={[styles.capacityStatus, { backgroundColor: getCapacityStatus().color }]}>
                <Text style={styles.capacityStatusText}>{getCapacityStatus().status}</Text>
              </View>
            </View>

            <View style={styles.capacityDisplay}>
              <Text style={styles.capacityCount}>{currentCount}</Text>
              <Text style={styles.capacityLabel}>Current: {currentCount} / Max: {maxCapacity}</Text>
              
              <View style={styles.capacityBar}>
                <LinearGradient
                  colors={[getCapacityStatus().color, getCapacityStatus().color]}
                  style={[styles.capacityFill, { width: `${Math.min(getCapacityPercentage(), 100)}%` }]}
                />
              </View>
            </View>

            <View style={styles.capacityButtons}>
              <TouchableOpacity 
                style={[
                  styles.capacityButton,
                  currentCount <= 0 && styles.capacityButtonDisabled
                ]}
                onPress={handlePersonOut}
                disabled={currentCount <= 0}
                testID="person-out-button"
              >
                <LinearGradient
                  colors={[theme.colors.error, '#FF6B6B']}
                  style={styles.capacityButtonGradient}
                >
                  <UserMinus size={20} color={theme.colors.white} />
                  <Text style={styles.capacityButtonText}>Person Out</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.capacityButton,
                  currentCount >= maxCapacity && styles.capacityButtonDisabled
                ]}
                onPress={handlePersonIn}
                disabled={currentCount >= maxCapacity}
                testID="person-in-button"
              >
                <LinearGradient
                  colors={[theme.colors.success, '#4ECDC4']}
                  style={styles.capacityButtonGradient}
                >
                  <UserPlus size={20} color={theme.colors.white} />
                  <Text style={styles.capacityButtonText}>Person In</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.chartSection}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Analytics</Text>
              <View style={styles.chartToggle}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    selectedChart === 'sales' && styles.toggleButtonActive,
                  ]}
                  onPress={() => setSelectedChart('sales')}
                  testID="sales-toggle"
                >
                  <Text
                    style={[
                      styles.toggleText,
                      selectedChart === 'sales' && styles.toggleTextActive,
                    ]}
                  >
                    Sales
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    selectedChart === 'income' && styles.toggleButtonActive,
                  ]}
                  onPress={() => setSelectedChart('income')}
                  testID="income-toggle"
                >
                  <Text
                    style={[
                      styles.toggleText,
                      selectedChart === 'income' && styles.toggleTextActive,
                    ]}
                  >
                    Income
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    selectedChart === 'views' && styles.toggleButtonActive,
                  ]}
                  onPress={() => setSelectedChart('views')}
                  testID="views-toggle"
                >
                  <Text
                    style={[
                      styles.toggleText,
                      selectedChart === 'views' && styles.toggleTextActive,
                    ]}
                  >
                    Views
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.chartContainer}>
              {getChartData().map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.chartBar,
                    { height: (item.value / maxValue) * 160 },
                  ]}
                />
              ))}
            </View>

            <View style={styles.chartLabels}>
              {getChartData().map((item, index) => (
                <Text key={index} style={styles.chartLabel}>
                  {item.label}
                </Text>
              ))}
            </View>
          </View>

          <View style={styles.quickActions}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionButton} testID="create-offer-action">
                <View style={styles.actionIcon}>
                  <BarChart3 size={24} color={theme.colors.purple} />
                </View>
                <Text style={styles.actionText}>Create Offer</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} testID="create-event-action">
                <View style={styles.actionIcon}>
                  <Calendar size={24} color={theme.colors.cyan} />
                </View>
                <Text style={styles.actionText}>Create Event</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} testID="view-customers-action">
                <View style={styles.actionIcon}>
                  <Users size={24} color={theme.colors.success} />
                </View>
                <Text style={styles.actionText}>View Customers</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} testID="analytics-action">
                <View style={styles.actionIcon}>
                  <TrendingUp size={24} color={theme.colors.warning} />
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