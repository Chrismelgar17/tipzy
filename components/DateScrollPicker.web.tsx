import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { theme } from '@/constants/theme';

interface DateScrollPickerWebProps {
  visible: boolean;
  onClose: () => void;
  onDateSelect: (date: Date) => void;
  initialDate?: Date;
  maximumDate?: Date;
  minimumDate?: Date;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function DateScrollPickerWeb({
  visible,
  onClose,
  onDateSelect,
  initialDate,
  maximumDate,
  minimumDate,
}: DateScrollPickerWebProps) {
  const currentYear = new Date().getFullYear();
  const minYear = minimumDate?.getFullYear() || 1900;
  const maxYear = maximumDate?.getFullYear() || currentYear;
  
  const [selectedMonth, setSelectedMonth] = useState<number>(
    initialDate?.getMonth() || 0
  );
  const [selectedDay, setSelectedDay] = useState<number>(
    initialDate?.getDate() || 1
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    initialDate?.getFullYear() || maxYear
  );

  // Generate years array
  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => maxYear - i
  );

  // Get days in selected month/year
  const getDaysInMonth = (month: number, year: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Adjust day if it's invalid for the selected month/year
  useEffect(() => {
    const maxDays = getDaysInMonth(selectedMonth, selectedYear);
    if (selectedDay > maxDays) {
      setSelectedDay(maxDays);
    }
  }, [selectedMonth, selectedYear, selectedDay]);

  const handleConfirm = () => {
    const selectedDate = new Date(selectedYear, selectedMonth, selectedDay);
    onDateSelect(selectedDate);
    onClose();
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: theme.borderRadius.lg,
      borderTopRightRadius: theme.borderRadius.lg,
      paddingBottom: 20,
    },
    modalHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: theme.colors.text.primary,
    },
    modalButton: {
      fontSize: 16,
      color: theme.colors.text.secondary,
    },
    modalButtonDone: {
      fontSize: 16,
      color: theme.colors.cyan,
      fontWeight: '600' as const,
    },
    webPickersContainer: {
      flexDirection: 'row' as const,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    webPickerColumn: {
      flex: 1,
    },
    webPickerLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.xs,
      textAlign: 'center' as const,
    },
    webPicker: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.sm,
      fontSize: 16,
      color: theme.colors.text.primary,
      width: '100%',
    },
  });

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Date of Birth</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.modalButtonDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.webPickersContainer}>
            <View style={styles.webPickerColumn}>
              <Text style={styles.webPickerLabel}>Month</Text>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt((e.target as HTMLSelectElement).value))}
                style={{
                  backgroundColor: theme.colors.background,
                  borderRadius: theme.borderRadius.md,
                  border: `1px solid ${theme.colors.border}`,
                  padding: theme.spacing.sm,
                  fontSize: 16,
                  color: theme.colors.text.primary,
                  width: '100%',
                } as React.CSSProperties}
              >
                {MONTHS.map((month, index) => (
                  <option key={month} value={index}>
                    {month}
                  </option>
                ))}
              </select>
            </View>
            <View style={styles.webPickerColumn}>
              <Text style={styles.webPickerLabel}>Day</Text>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(parseInt((e.target as HTMLSelectElement).value))}
                style={{
                  backgroundColor: theme.colors.background,
                  borderRadius: theme.borderRadius.md,
                  border: `1px solid ${theme.colors.border}`,
                  padding: theme.spacing.sm,
                  fontSize: 16,
                  color: theme.colors.text.primary,
                  width: '100%',
                } as React.CSSProperties}
              >
                {days.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </View>
            <View style={styles.webPickerColumn}>
              <Text style={styles.webPickerLabel}>Year</Text>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt((e.target as HTMLSelectElement).value))}
                style={{
                  backgroundColor: theme.colors.background,
                  borderRadius: theme.borderRadius.md,
                  border: `1px solid ${theme.colors.border}`,
                  padding: theme.spacing.sm,
                  fontSize: 16,
                  color: theme.colors.text.primary,
                  width: '100%',
                } as React.CSSProperties}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}