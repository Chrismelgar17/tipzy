import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle, Mail, ChevronDown, ChevronUp } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import api from '@/lib/api';

const FAQS = [
  {
    q: 'How do I add or update my venue photos?',
    a: 'Go to your business profile and tap "Edit Profile". You can upload new photos or remove existing ones.',
  },
  {
    q: 'How do subscriptions work?',
    a: 'Choose a monthly or annual plan in the Subscription tab. Your plan unlocks ticket sales, event creation, and analytics features.',
  },
  {
    q: 'How do I create and publish an event?',
    a: 'Go to the Events tab, tap the "+" button, fill in the event details and image, then save. Events appear on your venue profile immediately.',
  },
  {
    q: 'How do I track ticket orders?',
    a: 'All ticket purchases are visible in the Orders tab with real-time status updates.',
  },
  {
    q: 'How do I update the live crowd level?',
    a: 'Use the capacity controls on your Dashboard to increase or decrease the current guest count. This updates in real time for all users.',
  },
  {
    q: 'How do I cancel my subscription?',
    a: 'Contact our support team at tipzy.team@gmail.com to cancel or modify your subscription.',
  },
];

export default function BusinessSupportScreen() {
  const insets = useSafeAreaInsets();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Missing fields', 'Please fill in both subject and message.');
      return;
    }
    setSending(true);
    try {
      await api.post('/customer/support', { subject: subject.trim(), message: message.trim() });
      Alert.alert('Sent!', 'Our team will get back to you within 1 business day.');
      setSubject('');
      setMessage('');
    } catch {
      Linking.openURL(`mailto:tipzy.team@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <MessageCircle size={36} color={theme.colors.purple} />
        <Text style={styles.headerTitle}>Business Support</Text>
        <Text style={styles.headerSub}>Get help managing your venue, events, and subscription.</Text>
      </View>

      {/* FAQ */}
      <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
      {FAQS.map((item, idx) => (
        <TouchableOpacity
          key={idx}
          style={styles.faqCard}
          onPress={() => setOpenIndex(openIndex === idx ? null : idx)}
          activeOpacity={0.75}
        >
          <View style={styles.faqRow}>
            <Text style={styles.faqQuestion}>{item.q}</Text>
            {openIndex === idx
              ? <ChevronUp size={18} color={theme.colors.text.tertiary} />
              : <ChevronDown size={18} color={theme.colors.text.tertiary} />}
          </View>
          {openIndex === idx && (
            <Text style={styles.faqAnswer}>{item.a}</Text>
          )}
        </TouchableOpacity>
      ))}

      {/* Contact form */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Contact Us</Text>
      <View style={styles.form}>
        <Text style={styles.label}>Subject</Text>
        <TextInput
          style={styles.input}
          placeholder="What do you need help with?"
          placeholderTextColor={theme.colors.text.tertiary}
          value={subject}
          onChangeText={setSubject}
        />
        <Text style={styles.label}>Message</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Describe your issue in detail…"
          placeholderTextColor={theme.colors.text.tertiary}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
        <TouchableOpacity
          style={[styles.sendBtn, sending && { opacity: 0.6 }]}
          onPress={handleSend}
          disabled={sending}
        >
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <><Mail size={18} color="#fff" /><Text style={styles.sendBtnText}>Send Message</Text></>}
        </TouchableOpacity>
      </View>

      {/* Direct contact */}
      <View style={styles.directContact}>
        <Text style={styles.directText}>Or email us directly:</Text>
        <TouchableOpacity onPress={() => Linking.openURL('mailto:tipzy.team@gmail.com')}>
          <Text style={styles.emailLink}>tipzy.team@gmail.com</Text>
        </TouchableOpacity>
        <Text style={styles.hours}>Mon – Fri, 9 AM – 6 PM EST</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginTop: 12,
    marginBottom: 6,
  },
  headerSub: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  faqCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
  },
  faqAnswer: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 10,
    lineHeight: 21,
  },
  form: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text.primary,
  },
  textarea: {
    height: 120,
    textAlignVertical: 'top',
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.purple,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
    gap: 8,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  directContact: {
    alignItems: 'center',
    marginTop: 24,
    gap: 4,
  },
  directText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  emailLink: {
    fontSize: 15,
    color: theme.colors.purple,
    fontWeight: '600',
  },
  hours: {
    fontSize: 13,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
});
