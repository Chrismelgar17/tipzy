import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { theme } from '@/constants/theme';

interface DateScrollPickerProps {
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

export default function DateScrollPicker({
  visible,
  onClose,
  onDateSelect,
  initialDate,
  maximumDate,
  minimumDate,
}: DateScrollPickerProps) {
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
      paddingBottom: Platform.OS === 'ios' ? 34 : 20,
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
    pickersContainer: {
      flexDirection: 'row' as const,
      paddingHorizontal: theme.spacing.md,
    },
    pickerColumn: {
      flex: 1,
    },
    picker: {
      height: 200,
    },
    pickerItem: {
      fontSize: 16,
      color: theme.colors.text.primary,
    },
  });

  return (
    <Modal
      transparent
      animationType="slide"
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
          <View style={styles.pickersContainer}>
            <View style={styles.pickerColumn}>
              <Picker
                selectedValue={selectedMonth}
                onValueChange={setSelectedMonth}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {MONTHS.map((month, index) => (
                  <Picker.Item
                    key={month}
                    label={month}
                    value={index}
                  />
                ))}
              </Picker>
            </View>
            <View style={styles.pickerColumn}>
              <Picker
                selectedValue={selectedDay}
                onValueChange={setSelectedDay}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {days.map((day) => (
                  <Picker.Item
                    key={day}
                    label={day.toString()}
                    value={day}
                  />
                ))}
              </Picker>
            </View>
            <View style={styles.pickerColumn}>
              <Picker
                selectedValue={selectedYear}
                onValueChange={setSelectedYear}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {years.map((year) => (
                  <Picker.Item
                    key={year}
                    label={year.toString()}
                    value={year}
                  />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}