import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { 
  Settings as SettingsIcon, 
  Globe, 
  Palette, 
  Info, 
  HelpCircle,
  ChevronDown,
  Check,
  Shield,
  FileText,
  ChevronRight
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { AppSettings } from '@/types/models';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>({
    language: 'en',
    theme: 'dark',
  });

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ];

  const handleLanguageChange = (languageCode: 'en' | 'es' | 'fr') => {
    setSettings(prev => ({ ...prev, language: languageCode }));
    setShowLanguageModal(false);
    Alert.alert('Language Changed', 'The app language has been updated.');
  };

  const handleThemeToggle = () => {
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    setSettings(prev => ({ ...prev, theme: newTheme }));
    Alert.alert('Theme Changed', `Switched to ${newTheme} mode.`);
  };

  const handleHelpSupport = () => {
    setShowHelpModal(true);
  };

  const getCurrentLanguageName = () => {
    const lang = languages.find(l => l.code === settings.language);
    return lang ? `${lang.flag} ${lang.name}` : 'English';
  };

  const appVersion = '1.0.0';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text.primary,
        }}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <SettingsIcon size={32} color={theme.colors.purple} />
          <Text style={styles.headerTitle}>App Settings</Text>
          <Text style={styles.headerDescription}>
            Customize your app experience and preferences.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => setShowLanguageModal(true)}
          >
            <View style={styles.optionLeft}>
              <View style={styles.iconContainer}>
                <Globe size={20} color={theme.colors.purple} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Language</Text>
                <Text style={styles.optionDescription}>Choose your preferred language</Text>
              </View>
            </View>
            <View style={styles.optionRight}>
              <Text style={styles.optionValue}>{getCurrentLanguageName()}</Text>
              <ChevronDown size={20} color={theme.colors.text.tertiary} />
            </View>
          </TouchableOpacity>

          <View style={styles.optionItem}>
            <View style={styles.optionLeft}>
              <View style={styles.iconContainer}>
                <Palette size={20} color={theme.colors.purple} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Theme</Text>
                <Text style={styles.optionDescription}>
                  {settings.theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.theme === 'dark'}
              onValueChange={handleThemeToggle}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.purple + '40',
              }}
              thumbColor={settings.theme === 'dark' ? theme.colors.purple : theme.colors.text.tertiary}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => router.push('/privacy-policy' as any)}
          >
            <View style={styles.optionLeft}>
              <View style={styles.iconContainer}>
                <Shield size={20} color={theme.colors.purple} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Privacy Policy</Text>
                <Text style={styles.optionDescription}>How we handle your data</Text>
              </View>
            </View>
            <ChevronRight size={20} color={theme.colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => router.push('/terms-conditions' as any)}
          >
            <View style={styles.optionLeft}>
              <View style={styles.iconContainer}>
                <FileText size={20} color={theme.colors.purple} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Terms & Conditions</Text>
                <Text style={styles.optionDescription}>App usage terms and conditions</Text>
              </View>
            </View>
            <ChevronRight size={20} color={theme.colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity
            style={styles.optionItem}
            onPress={handleHelpSupport}
          >
            <View style={styles.optionLeft}>
              <View style={styles.iconContainer}>
                <HelpCircle size={20} color={theme.colors.purple} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Help & Support</Text>
                <Text style={styles.optionDescription}>Get help or contact support</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.optionItem}>
            <View style={styles.optionLeft}>
              <View style={styles.iconContainer}>
                <Info size={20} color={theme.colors.purple} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>App Version</Text>
                <Text style={styles.optionDescription}>Current version information</Text>
              </View>
            </View>
            <Text style={styles.optionValue}>{appVersion}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Language</Text>
            <View style={styles.placeholder} />
          </View>
          
          <View style={styles.modalContent}>
            {languages.map((language) => (
              <TouchableOpacity
                key={language.code}
                style={styles.languageOption}
                onPress={() => handleLanguageChange(language.code as 'en' | 'es' | 'fr')}
              >
                <View style={styles.languageInfo}>
                  <Text style={styles.languageFlag}>{language.flag}</Text>
                  <Text style={styles.languageName}>{language.name}</Text>
                </View>
                {settings.language === language.code && (
                  <Check size={20} color={theme.colors.purple} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Help & Support Modal */}
      <Modal
        visible={showHelpModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowHelpModal(false)}>
              <Text style={styles.cancelButton}>Done</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Help & Support</Text>
            <View style={styles.placeholder} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.helpSection}>
              <Text style={styles.helpSectionTitle}>Frequently Asked Questions</Text>
              
              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>How do I add venues to favorites?</Text>
                <Text style={styles.faqAnswer}>
                  Tap the heart icon on any venue card to add it to your favorites. You can view all your favorites in the Profile tab.
                </Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>How do I purchase tickets?</Text>
                <Text style={styles.faqAnswer}>
                  Browse events, select the one you want, choose your ticket type, and proceed to checkout with your saved payment method.
                </Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>Can I get refunds for tickets?</Text>
                <Text style={styles.faqAnswer}>
                  Refund policies vary by venue and event. Check the event details or contact the venue directly for their refund policy.
                </Text>
              </View>
            </View>

            <View style={styles.helpSection}>
              <Text style={styles.helpSectionTitle}>Contact Support</Text>
              <Text style={styles.contactInfo}>
                If you need additional help, you can reach our support team:
              </Text>
              <Text style={styles.contactDetail}>📧 support@tipzy.app</Text>
              <Text style={styles.contactDetail}>📞 1-800-NIGHTLIFE</Text>
              <Text style={styles.contactDetail}>🕒 Mon-Fri, 9 AM - 6 PM EST</Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  headerDescription: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.purple + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  optionValue: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  cancelButton: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  placeholder: {
    width: 60,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  languageFlag: {
    fontSize: 24,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  helpSection: {
    marginBottom: theme.spacing.xl,
  },
  helpSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  faqItem: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  faqAnswer: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  contactInfo: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 24,
  },
  contactDetail: {
    fontSize: 16,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
  },
});