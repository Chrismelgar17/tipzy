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

interface TimeScrollPickerProps {
  visible: boolean;
  onClose: () => void;
  /** Called with time in 24-hour 'HH:MM' format */
  onTimeSelect: (time: string) => void;
  /** Initial time in 24-hour 'HH:MM' format, e.g. '18:00' */
  initialTime?: string;
  title?: string;
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const PERIODS: ('AM' | 'PM')[] = ['AM', 'PM'];

/** Parse a 24-h 'HH:MM' string into 12-h picker values */
function parse24h(time: string): { hour: number; minute: number; period: 'AM' | 'PM' } {
  const [hStr, mStr] = (time ?? '12:00').split(':');
  const h24 = parseInt(hStr, 10) || 0;
  const rawMin = parseInt(mStr, 10) || 0;
  // Round to nearest 5-minute slot
  const minute = Math.round(rawMin / 5) * 5 === 60 ? 55 : Math.round(rawMin / 5) * 5;
  const period: 'AM' | 'PM' = h24 < 12 ? 'AM' : 'PM';
  const hour = h24 % 12 || 12;
  return { hour, minute, period };
}

/** Convert 12-h picker values back to 24-h 'HH:MM' string */
function to24h(hour: number, minute: number, period: 'AM' | 'PM'): string {
  const h24 = (hour % 12) + (period === 'PM' ? 12 : 0);
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export default function TimeScrollPicker({
  visible,
  onClose,
  onTimeSelect,
  initialTime = '12:00',
  title = 'Select Time',
}: TimeScrollPickerProps) {
  const initial = parse24h(initialTime);
  const [selectedHour, setSelectedHour] = useState<number>(initial.hour);
  const [selectedMinute, setSelectedMinute] = useState<number>(initial.minute);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(initial.period);

  // Re-sync whenever the modal opens with a new initialTime
  useEffect(() => {
    if (visible) {
      const parsed = parse24h(initialTime);
      setSelectedHour(parsed.hour);
      setSelectedMinute(parsed.minute);
      setSelectedPeriod(parsed.period);
    }
  }, [visible, initialTime]);

  const handleConfirm = () => {
    onTimeSelect(to24h(selectedHour, selectedMinute, selectedPeriod));
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
    cancelButton: {
      fontSize: 16,
      color: theme.colors.text.secondary,
    },
    doneButton: {
      fontSize: 16,
      color: theme.colors.cyan ?? theme.colors.purple,
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
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.doneButton}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickersContainer}>
            {/* Hour column */}
            <View style={styles.pickerColumn}>
              <Picker
                selectedValue={selectedHour}
                onValueChange={(v) => setSelectedHour(v as number)}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {HOURS.map((h) => (
                  <Picker.Item key={h} label={String(h)} value={h} />
                ))}
              </Picker>
            </View>

            {/* Minute column */}
            <View style={styles.pickerColumn}>
              <Picker
                selectedValue={selectedMinute}
                onValueChange={(v) => setSelectedMinute(v as number)}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {MINUTES.map((m) => (
                  <Picker.Item
                    key={m}
                    label={String(m).padStart(2, '0')}
                    value={m}
                  />
                ))}
              </Picker>
            </View>

            {/* AM / PM column */}
            <View style={styles.pickerColumn}>
              <Picker
                selectedValue={selectedPeriod}
                onValueChange={(v) => setSelectedPeriod(v as 'AM' | 'PM')}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {PERIODS.map((p) => (
                  <Picker.Item key={p} label={p} value={p} />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
