import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/theme-context';
import { useAuth } from '@/hooks/auth-context';
import { ArrowLeft, Clock } from 'lucide-react-native';
import { WorkHours, DayHours } from '@/types/models';
import TimeScrollPicker from '@/components/TimeScrollPicker';

/** Format a 24-h 'HH:MM' string as '12:00 PM' for display */
function format12h(time: string): string {
  const [hStr, mStr] = (time ?? '00:00').split(':');
  const h24 = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  const period = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;


export default function BusinessHoursScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [workHours, setWorkHours] = useState<WorkHours>({
    monday: { isOpen: false, openTime: '18:00', closeTime: '02:00' },
    tuesday: { isOpen: false, openTime: '18:00', closeTime: '02:00' },
    wednesday: { isOpen: false, openTime: '18:00', closeTime: '02:00' },
    thursday: { isOpen: true, openTime: '18:00', closeTime: '02:00' },
    friday: { isOpen: true, openTime: '18:00', closeTime: '03:00' },
    saturday: { isOpen: true, openTime: '18:00', closeTime: '03:00' },
    sunday: { isOpen: false, openTime: '18:00', closeTime: '02:00' },
  });

  const [showTimePicker, setShowTimePicker] = useState<{
    day: keyof WorkHours | null;
    type: 'open' | 'close' | null;
  }>({ day: null, type: null });

  if (!isLoading && !isAuthenticated) {
    router.replace('/(auth)/signin' as any);
    return null;
  }

  const handleDayToggle = (day: keyof WorkHours) => {
    setWorkHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOpen: !prev[day].isOpen
      }
    }));
  };

  const handleTimeSelect = (time: string) => {
    if (!showTimePicker.day || !showTimePicker.type) return;
    setWorkHours(prev => ({
      ...prev,
      [showTimePicker.day!]: {
        ...prev[showTimePicker.day!],
        [showTimePicker.type === 'open' ? 'openTime' : 'closeTime']: time,
      },
    }));
    setShowTimePicker({ day: null, type: null });
  };

  const handleContinue = async () => {
    try {
      const raw = await AsyncStorage.getItem('businessProfile');
      const profile = raw ? JSON.parse(raw) : {};
      await AsyncStorage.setItem('businessProfile', JSON.stringify({ ...profile, workHours }));
    } catch {}
    router.push('/onboarding/business-plans' as any);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      padding: 8,
      marginRight: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600' as const,
      color: theme.colors.text.primary,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    scrollContent: {
      paddingVertical: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold' as const,
      color: theme.colors.text.primary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.text.secondary,
      marginBottom: 32,
      lineHeight: 22,
    },
    dayContainer: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    dayHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    dayName: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: theme.colors.text.primary,
    },
    timeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    timeButton: {
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: 12,
      minWidth: 80,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    timeButtonText: {
      fontSize: 16,
      color: theme.colors.text.primary,
    },
    timeSeparator: {
      fontSize: 16,
      color: theme.colors.text.secondary,
    },
    closedText: {
      fontSize: 16,
      color: theme.colors.text.secondary,
      fontStyle: 'italic',
    },
    continueButton: {
      backgroundColor: theme.colors.purple,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 32,
      marginBottom: 20,
    },
    continueButtonText: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: theme.colors.white,
    },

  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          testID="back-button"
        >
          <ArrowLeft size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Work Hours</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.scrollContent}>
          <Text style={styles.title}>Set Your Work Hours</Text>
          <Text style={styles.subtitle}>
            Let customers know when your venue is open
          </Text>

          {DAYS.map(({ key, label }) => (
            <View key={key} style={styles.dayContainer}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayName}>{label}</Text>
                <Switch
                  value={workHours[key].isOpen}
                  onValueChange={() => handleDayToggle(key)}
                  trackColor={{ 
                    false: theme.colors.gray[600], 
                    true: theme.colors.purple 
                  }}
                  thumbColor={theme.colors.white}
                  testID={`${key}-switch`}
                />
              </View>
              
              {workHours[key].isOpen ? (
                <View style={styles.timeContainer}>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowTimePicker({ day: key, type: 'open' })}
                    testID={`${key}-open-time`}
                  >
                    <Text style={styles.timeButtonText}>
                      {format12h(workHours[key].openTime)}
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.timeSeparator}>to</Text>

                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowTimePicker({ day: key, type: 'close' })}
                    testID={`${key}-close-time`}
                  >
                    <Text style={styles.timeButtonText}>
                      {format12h(workHours[key].closeTime)}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.closedText}>Closed</Text>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            testID="continue-button"
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TimeScrollPicker
        visible={!!(showTimePicker.day && showTimePicker.type)}
        onClose={() => setShowTimePicker({ day: null, type: null })}
        onTimeSelect={handleTimeSelect}
        initialTime={
          showTimePicker.day
            ? showTimePicker.type === 'open'
              ? workHours[showTimePicker.day].openTime
              : workHours[showTimePicker.day].closeTime
            : '12:00'
        }
        title={`Select ${showTimePicker.type === 'open' ? 'Opening' : 'Closing'} Time`}
      />
    </SafeAreaView>
  );
}