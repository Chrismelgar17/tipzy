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
import { useTheme } from '@/hooks/theme-context';
import { ArrowLeft, Clock } from 'lucide-react-native';
import { WorkHours, DayHours } from '@/types/models';

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00',
  '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00',
  '01:00', '02:00', '03:00', '04:00', '05:00', '06:00'
];

export default function BusinessHoursScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  
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
        [showTimePicker.type === 'open' ? 'openTime' : 'closeTime']: time
      }
    }));
    
    setShowTimePicker({ day: null, type: null });
  };

  const handleContinue = () => {
    router.push('/onboarding/business-confirmation' as any);
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
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    modalContent: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 20,
      width: '90%',
      maxHeight: '70%',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600' as const,
      color: theme.colors.text.primary,
      marginBottom: 16,
      textAlign: 'center',
    },
    timeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    timeOption: {
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: 12,
      minWidth: 70,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    timeOptionText: {
      fontSize: 16,
      color: theme.colors.text.primary,
    },
    modalCloseButton: {
      backgroundColor: theme.colors.purple,
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
      marginTop: 16,
    },
    modalCloseButtonText: {
      color: theme.colors.white,
      fontWeight: '600' as const,
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
                      {workHours[key].openTime}
                    </Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.timeSeparator}>to</Text>
                  
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowTimePicker({ day: key, type: 'close' })}
                    testID={`${key}-close-time`}
                  >
                    <Text style={styles.timeButtonText}>
                      {workHours[key].closeTime}
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

      {showTimePicker.day && showTimePicker.type && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Select {showTimePicker.type === 'open' ? 'Opening' : 'Closing'} Time
            </Text>
            <ScrollView>
              <View style={styles.timeGrid}>
                {TIME_SLOTS.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={styles.timeOption}
                    onPress={() => handleTimeSelect(time)}
                    testID={`time-option-${time}`}
                  >
                    <Text style={styles.timeOptionText}>{time}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowTimePicker({ day: null, type: null })}
              testID="close-time-picker"
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}