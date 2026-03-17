import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  RefreshControl,
  Image,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/hooks/theme-context';
import { useFocusEffect } from 'expo-router';
import {
  Calendar,
  Plus,
  Clock,
  Trash2,
  Pencil,
  X,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ImageIcon,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '@/lib/api';
import { uploadImageToCloud, isLocalUri } from '@/lib/upload';

interface BusinessEvent {
  id: string;
  venue_id: string;
  venue_name: string;
  name: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  image: string | null;
  status: string;
  created_at: string;
}

interface EventForm {
  name: string;
  date: string;
  time: string;
  description: string;
  image: string;
}

const EMPTY_FORM: EventForm = { name: '', date: '', time: '', description: '', image: '' };

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr: string | null) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

function isUpcoming(dateStr: string) {
  return new Date(dateStr) >= new Date(new Date().toDateString());
}

export default function EventsScreen() {
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const [events, setEvents] = useState<BusinessEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedDay, setSelectedDay] = useState<{ year: number; month: number; day: number } | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<BusinessEvent | null>(null);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Date / time picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [eventsRes, venueRes] = await Promise.all([
        api.get('/business/events'),
        api.get('/business/venues'),
      ]);
      setEvents(eventsRes.data?.events ?? []);
      const venues = venueRes.data?.venues ?? [];
      if (venues.length > 0) setVenueId(venues[0].id);
    } catch (err) {
      console.error('[EventsScreen] fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const openCreateModal = () => {
    setEditingEvent(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEditModal = (event: BusinessEvent) => {
    setEditingEvent(event);
    setForm({
      name: event.name,
      date: event.event_date?.slice(0, 10) ?? '',
      time: event.event_time?.slice(0, 5) ?? '',
      description: event.description ?? '',
      image: event.image ?? '',
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingEvent(null);
    setForm(EMPTY_FORM);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setForm(f => ({ ...f, image: result.assets[0].uri }));
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.date.trim() || !form.time.trim()) {
      Alert.alert('Missing fields', 'Please fill in event name, date, and time.');
      return;
    }
    if (!venueId) {
      Alert.alert('Error', 'No venue found for your account.');
      return;
    }
    setSaving(true);
    try {
      // Upload image if a local file was selected
      let imageUrl = form.image.trim() || undefined;
      if (imageUrl && isLocalUri(imageUrl)) {
        imageUrl = await uploadImageToCloud(imageUrl);
      }

      if (editingEvent) {
        // Edit
        await api.patch(`/business/events/${editingEvent.id}`, {
          name: form.name.trim(),
          date: form.date.trim(),
          time: form.time.trim(),
          description: form.description.trim() || undefined,
          image: imageUrl,
        });
        setEvents(prev =>
          prev.map(e =>
            e.id === editingEvent.id
              ? {
                  ...e,
                  name: form.name.trim(),
                  event_date: form.date.trim(),
                  event_time: form.time.trim(),
                  description: form.description.trim() || null,
                  image: imageUrl ?? null,
                }
              : e,
          ),
        );
        Alert.alert('Saved', 'Event updated successfully.');
      } else {
        // Create
        const res = await api.post('/business/events', {
          venueId,
          name: form.name.trim(),
          date: form.date.trim(),
          time: form.time.trim(),
          description: form.description.trim() || undefined,
          image: imageUrl,
        });
        const newEvent: BusinessEvent = res.data?.event ?? {
          id: Date.now().toString(),
          venue_id: venueId,
          venue_name: '',
          name: form.name.trim(),
          description: form.description.trim() || null,
          event_date: form.date.trim(),
          event_time: form.time.trim(),
          image: imageUrl ?? null,
          status: 'active',
          created_at: new Date().toISOString(),
        };
        setEvents(prev => [newEvent, ...prev]);
        Alert.alert('Created', 'Event added to your calendar.');
      }
      closeModal();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error ?? 'Could not save event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (event: BusinessEvent) => {
    Alert.alert(
      'Delete Event',
      `Remove "${event.name}" from your calendar?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/business/events/${event.id}`);
              setEvents(prev => prev.filter(e => e.id !== event.id));
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.error ?? 'Could not delete event.');
            }
          },
        },
      ],
    );
  };

  const filtered = events
    .filter(e => tab === 'upcoming' ? isUpcoming(e.event_date) : !isUpcoming(e.event_date))
    .filter(e => {
      if (!selectedDay) return true;
      const d = new Date(e.event_date);
      return (
        d.getFullYear() === selectedDay.year &&
        d.getMonth()    === selectedDay.month &&
        d.getDate()     === selectedDay.day
      );
    });

  // ── calendar helpers ─────────────────────────────────────────────────────────
  const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  /** set of YYYY-MM-DD strings for events in current month's tab */
  const eventDates = new Set(
    events
      .filter(e => tab === 'upcoming' ? isUpcoming(e.event_date) : !isUpcoming(e.event_date))
      .map(e => e.event_date?.slice(0, 10))
  );

  const prevMonth = () => setCalendarMonth(prev => {
    if (prev.month === 0) return { year: prev.year - 1, month: 11 };
    return { year: prev.year, month: prev.month - 1 };
  });
  const nextMonth = () => setCalendarMonth(prev => {
    if (prev.month === 11) return { year: prev.year + 1, month: 0 };
    return { year: prev.year, month: prev.month + 1 };
  });

  const renderCalendar = () => {
    const { year, month } = calendarMonth;
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Build blank + day cells
    const cells: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // Pad to multiple of 7
    while (cells.length % 7 !== 0) cells.push(null);

    const today = new Date();
    const todayKey = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : -1;

    return (
      <View style={s.calendarBox}>
        {/* Month navigator */}
        <View style={s.calNavRow}>
          <TouchableOpacity onPress={prevMonth} style={s.calNavBtn}>
            <ChevronLeft size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
          <Text style={s.calMonthLabel}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={s.calNavBtn}>
            <ChevronRight size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>
        {/* Day-of-week headers */}
        <View style={s.calWeekRow}>
          {DAYS_SHORT.map((d, i) => (
            <Text key={i} style={s.calDayHeader}>{d}</Text>
          ))}
        </View>
        {/* Day cells */}
        <View style={s.calGrid}>
          {cells.map((day, idx) => {
            if (!day) return <View key={`empty-${idx}`} style={s.calCell} />;
            const isoStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasEvent = eventDates.has(isoStr);
            const isToday = day === todayKey;
            const isSelected =
              selectedDay?.year === year &&
              selectedDay?.month === month &&
              selectedDay?.day === day;
            return (
              <TouchableOpacity
                key={day}
                style={[s.calCell, isSelected && s.calCellSelected]}
                onPress={() => setSelectedDay(isSelected ? null : { year, month, day })}
                activeOpacity={0.7}
              >
                <Text style={[
                  s.calDayNum,
                  isToday && s.calDayToday,
                  isSelected && s.calDaySelected,
                ]}>{day}</Text>
                {hasEvent && (
                  <View style={[s.calDot, isSelected && s.calDotSelected]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        {selectedDay && (
          <TouchableOpacity
            style={s.calClearBtn}
            onPress={() => setSelectedDay(null)}
          >
            <Text style={s.calClearBtnText}>Show all events</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={s.emptyContainer}>
      <CalendarDays size={52} color={theme.colors.text.tertiary} />
      <Text style={s.emptyTitle}>{tab === 'upcoming' ? 'No upcoming events' : 'No past events'}</Text>
      {tab === 'upcoming' && (
        <Text style={s.emptySubtitle}>Tap the + button to add your first event</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      {/* Tab bar */}
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'upcoming' && s.tabBtnActive]}
          onPress={() => setTab('upcoming')}
        >
          <Text style={[s.tabBtnText, tab === 'upcoming' && s.tabBtnTextActive]}>Upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'past' && s.tabBtnActive]}
          onPress={() => setTab('past')}
        >
          <Text style={[s.tabBtnText, tab === 'past' && s.tabBtnTextActive]}>Past</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar grid */}
      {renderCalendar()}

      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.purple} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)}
              tintColor={theme.colors.purple} />
          }
        >
          {filtered.length === 0
            ? renderEmpty()
            : filtered.map(event => (
                <View key={event.id} style={s.card}>
                  {/* Date badge */}
                  <View style={s.dateBadge}>
                    <Text style={s.dateBadgeMonth}>
                      {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                    </Text>
                    <Text style={s.dateBadgeDay}>
                      {new Date(event.event_date).getDate()}
                    </Text>
                  </View>

                  {/* Event info */}
                  <View style={s.cardBody}>
                    <Text style={s.cardTitle} numberOfLines={1}>{event.name}</Text>
                    <View style={s.cardMeta}>
                      <Calendar size={13} color={theme.colors.text.secondary} />
                      <Text style={s.cardMetaText}>{formatDate(event.event_date)}</Text>
                    </View>
                    {event.event_time && (
                      <View style={s.cardMeta}>
                        <Clock size={13} color={theme.colors.text.secondary} />
                        <Text style={s.cardMetaText}>{formatTime(event.event_time)}</Text>
                      </View>
                    )}
                    {event.description ? (
                      <Text style={s.cardDesc} numberOfLines={2}>{event.description}</Text>
                    ) : null}
                  </View>

                  {/* Actions */}
                  <View style={s.cardActions}>
                    <TouchableOpacity style={s.actionBtn} onPress={() => openEditModal(event)}>
                      <Pencil size={16} color={theme.colors.purple} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(event)}>
                      <Trash2 size={16} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={openCreateModal} activeOpacity={0.85}>
        <Plus size={26} color="#fff" />
      </TouchableOpacity>

      {/* Create / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            {/* Header */}
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editingEvent ? 'Edit Event' : 'New Event'}</Text>
              <TouchableOpacity onPress={closeModal} style={s.modalClose}>
                <X size={22} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalBody}>
              {/* Name */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Event Name <Text style={s.required}>*</Text></Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g., Saturday Night Party"
                  placeholderTextColor={theme.colors.text.tertiary}
                  value={form.name}
                  onChangeText={t => setForm(f => ({ ...f, name: t }))}
                />
              </View>

              {/* Date */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Date <Text style={s.required}>*</Text></Text>
                <TouchableOpacity
                  style={s.pickerBtn}
                  onPress={() => {
                    const d = form.date ? new Date(form.date) : new Date();
                    setPickerDate(isNaN(d.getTime()) ? new Date() : d);
                    setShowDatePicker(true);
                  }}
                >
                  <Calendar size={18} color={theme.colors.purple} />
                  <Text style={form.date ? s.pickerBtnText : s.pickerBtnPlaceholder}>
                    {form.date
                      ? new Date(form.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Select a date'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Time */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Start Time <Text style={s.required}>*</Text></Text>
                <TouchableOpacity
                  style={s.pickerBtn}
                  onPress={() => {
                    const base = new Date();
                    if (form.time) {
                      const [h, m] = form.time.split(':').map(Number);
                      base.setHours(h, m, 0, 0);
                    }
                    setPickerDate(base);
                    setShowTimePicker(true);
                  }}
                >
                  <Clock size={18} color={theme.colors.purple} />
                  <Text style={form.time ? s.pickerBtnText : s.pickerBtnPlaceholder}>
                    {form.time ? formatTime(form.time) : 'Select a time'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Date picker modal (iOS) / inline (Android) */}
              {showDatePicker && (
                Platform.OS === 'ios' ? (
                  <Modal transparent animationType="fade">
                    <View style={s.pickerOverlay}>
                      <View style={s.pickerSheet}>
                        <DateTimePicker
                          value={pickerDate}
                          mode="date"
                          display="spinner"
                          minimumDate={new Date()}
                          onChange={(_, d) => { if (d) setPickerDate(d); }}
                          textColor={theme.colors.text.primary}
                          themeVariant="dark"
                        />
                        <TouchableOpacity
                          style={s.pickerDoneBtn}
                          onPress={() => {
                            const yyyy = pickerDate.getFullYear();
                            const mm = String(pickerDate.getMonth() + 1).padStart(2, '0');
                            const dd = String(pickerDate.getDate()).padStart(2, '0');
                            setForm(f => ({ ...f, date: `${yyyy}-${mm}-${dd}` }));
                            setShowDatePicker(false);
                          }}
                        >
                          <Text style={s.pickerDoneText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Modal>
                ) : (
                  <DateTimePicker
                    value={pickerDate}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={(_, d) => {
                      setShowDatePicker(false);
                      if (d) {
                        const yyyy = d.getFullYear();
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const dy = String(d.getDate()).padStart(2, '0');
                        setForm(f => ({ ...f, date: `${yyyy}-${mm}-${dy}` }));
                      }
                    }}
                  />
                )
              )}

              {/* Time picker modal (iOS) / inline (Android) */}
              {showTimePicker && (
                Platform.OS === 'ios' ? (
                  <Modal transparent animationType="fade">
                    <View style={s.pickerOverlay}>
                      <View style={s.pickerSheet}>
                        <DateTimePicker
                          value={pickerDate}
                          mode="time"
                          display="spinner"
                          is24Hour={false}
                          onChange={(_, d) => { if (d) setPickerDate(d); }}
                          textColor={theme.colors.text.primary}
                          themeVariant="dark"
                        />
                        <TouchableOpacity
                          style={s.pickerDoneBtn}
                          onPress={() => {
                            const h = String(pickerDate.getHours()).padStart(2, '0');
                            const m = String(pickerDate.getMinutes()).padStart(2, '0');
                            setForm(f => ({ ...f, time: `${h}:${m}` }));
                            setShowTimePicker(false);
                          }}
                        >
                          <Text style={s.pickerDoneText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Modal>
                ) : (
                  <DateTimePicker
                    value={pickerDate}
                    mode="time"
                    display="default"
                    is24Hour={false}
                    onChange={(_, d) => {
                      setShowTimePicker(false);
                      if (d) {
                        const h = String(d.getHours()).padStart(2, '0');
                        const m = String(d.getMinutes()).padStart(2, '0');
                        setForm(f => ({ ...f, time: `${h}:${m}` }));
                      }
                    }}
                  />
                )
              )}

              {/* Description */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Description</Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  placeholder="What's happening at this event?"
                  placeholderTextColor={theme.colors.text.tertiary}
                  value={form.description}
                  onChangeText={t => setForm(f => ({ ...f, description: t }))}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Event Image */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Event Image</Text>
                <TouchableOpacity style={s.imagePicker} onPress={handlePickImage} activeOpacity={0.7}>
                  {form.image ? (
                    <Image source={{ uri: form.image }} style={s.imagePreview} resizeMode="cover" />
                  ) : (
                    <View style={s.imagePickerPlaceholder}>
                      <ImageIcon size={28} color={theme.colors.text.tertiary} />
                      <Text style={s.imagePickerText}>Tap to add a photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {form.image ? (
                  <TouchableOpacity onPress={() => setForm(f => ({ ...f, image: '' }))} style={s.removeImageBtn}>
                    <Text style={s.removeImageText}>Remove image</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Save */}
              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.saveBtnText}>{editingEvent ? 'Save Changes' : 'Add to Calendar'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    tabRow: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 8,
      backgroundColor: theme.colors.card,
      borderRadius: 10,
      padding: 3,
    },
    tabBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: 'center',
    },
    tabBtnActive: {
      backgroundColor: theme.colors.purple,
    },
    tabBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text.secondary,
    },
    tabBtnTextActive: {
      color: '#fff',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    list: {
      padding: 16,
      paddingBottom: 100,
      gap: 12,
    },
    card: {
      flexDirection: 'row',
      backgroundColor: theme.colors.card,
      borderRadius: 14,
      padding: 14,
      alignItems: 'center',
      gap: 14,
    },
    dateBadge: {
      width: 50,
      height: 58,
      borderRadius: 10,
      backgroundColor: theme.colors.purple,
      justifyContent: 'center',
      alignItems: 'center',
    },
    dateBadgeMonth: {
      fontSize: 11,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.8)',
      letterSpacing: 0.5,
    },
    dateBadgeDay: {
      fontSize: 22,
      fontWeight: '800',
      color: '#fff',
    },
    cardBody: {
      flex: 1,
      gap: 4,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: 2,
    },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    cardMetaText: {
      fontSize: 13,
      color: theme.colors.text.secondary,
    },
    cardDesc: {
      fontSize: 12,
      color: theme.colors.text.tertiary,
      marginTop: 4,
      lineHeight: 17,
    },
    cardActions: {
      gap: 10,
      alignItems: 'center',
    },
    actionBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      alignItems: 'center',
      paddingTop: 80,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text.secondary,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.colors.text.tertiary,
      textAlign: 'center',
      paddingHorizontal: 40,
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 28,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.purple,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.purple,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.45,
      shadowRadius: 10,
      elevation: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text.primary,
    },
    modalClose: {
      padding: 4,
    },
    modalBody: {
      padding: 20,
      gap: 18,
      paddingBottom: 40,
    },
    fieldGroup: {
      gap: 8,
    },
    fieldLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text.primary,
    },
    required: {
      color: theme.colors.error,
    },
    input: {
      backgroundColor: theme.colors.card,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.colors.text.primary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    saveBtn: {
      backgroundColor: theme.colors.purple,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 8,
    },
    saveBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    pickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    pickerBtnText: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.text.primary,
    },
    pickerBtnPlaceholder: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.text.tertiary,
    },
    pickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    pickerSheet: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 32,
    },
    pickerDoneBtn: {
      alignSelf: 'flex-end',
      marginRight: 20,
      marginTop: 4,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    pickerDoneText: {
      color: theme.colors.purple,
      fontSize: 16,
      fontWeight: '600',
    },
    imagePicker: {
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
    },
    imagePreview: {
      width: '100%',
      height: 160,
    },
    imagePickerPlaceholder: {
      height: 120,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.card,
    },
    imagePickerText: {
      color: theme.colors.text.tertiary,
      fontSize: 14,
    },
    removeImageBtn: {
      marginTop: 6,
      alignSelf: 'flex-end',
    },
    removeImageText: {
      color: theme.colors.error,
      fontSize: 13,
    },
    // ── Calendar styles ───────────────────────────────────────────────────────
    calendarBox: {
      backgroundColor: theme.colors.card,
      marginHorizontal: 16,
      marginBottom: 8,
      marginTop: 4,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingTop: 14,
      paddingBottom: 10,
    },
    calNavRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    calNavBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calMonthLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text.primary,
    },
    calWeekRow: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    calDayHeader: {
      flex: 1,
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.text.tertiary,
      paddingVertical: 4,
    },
    calGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    calCell: {
      width: `${100 / 7}%` as any,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    },
    calCellSelected: {
      backgroundColor: theme.colors.purple,
    },
    calDayNum: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.text.secondary,
    },
    calDayToday: {
      color: theme.colors.purple,
      fontWeight: '800',
    },
    calDaySelected: {
      color: '#fff',
      fontWeight: '800',
    },
    calDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.colors.purple,
      marginTop: 2,
    },
    calDotSelected: {
      backgroundColor: 'rgba(255,255,255,0.8)',
    },
    calClearBtn: {
      alignSelf: 'center',
      marginTop: 6,
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
    },
    calClearBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.text.tertiary,
    },
  });
}
