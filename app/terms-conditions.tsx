import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Stack } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { theme } from '@/constants/theme';

export default function TermsConditionsScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Terms & Conditions',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text.primary,
        }}
      />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <FileText size={32} color={theme.colors.purple} />
            <Text style={styles.headerTitle}>Terms & Conditions</Text>
            <Text style={styles.lastUpdated}>Last updated: January 2025</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
            <Text style={styles.sectionText}>
              By downloading, installing, or using the Tipzy mobile application, you agree to be 
              bound by these Terms and Conditions. If you do not agree to these terms, please do 
              not use our service.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Description of Service</Text>
            <Text style={styles.sectionText}>
              Tipzy is a mobile application that connects users with nightlife venues, events, and 
              experiences. Our service allows you to:
            </Text>
            <Text style={styles.bulletPoint}>• Discover nearby bars, clubs, and events</Text>
            <Text style={styles.bulletPoint}>• Purchase tickets and make reservations</Text>
            <Text style={styles.bulletPoint}>• View real-time venue capacity and crowd information</Text>
            <Text style={styles.bulletPoint}>• Connect with other users and venues</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. User Accounts</Text>
            <Text style={styles.sectionText}>
              To use certain features of our service, you must create an account. You are responsible for:
            </Text>
            <Text style={styles.bulletPoint}>• Maintaining the confidentiality of your account credentials</Text>
            <Text style={styles.bulletPoint}>• All activities that occur under your account</Text>
            <Text style={styles.bulletPoint}>• Providing accurate and up-to-date information</Text>
            <Text style={styles.bulletPoint}>• Notifying us immediately of any unauthorized use</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Acceptable Use</Text>
            <Text style={styles.sectionText}>
              You agree not to use our service to:
            </Text>
            <Text style={styles.bulletPoint}>• Violate any applicable laws or regulations</Text>
            <Text style={styles.bulletPoint}>• Harass, abuse, or harm other users</Text>
            <Text style={styles.bulletPoint}>• Post false, misleading, or inappropriate content</Text>
            <Text style={styles.bulletPoint}>• Interfere with the proper functioning of the service</Text>
            <Text style={styles.bulletPoint}>• Attempt to gain unauthorized access to our systems</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Payments and Refunds</Text>
            <Text style={styles.sectionText}>
              When you make purchases through our app:
            </Text>
            <Text style={styles.bulletPoint}>• All payments are processed securely through third-party providers</Text>
            <Text style={styles.bulletPoint}>• Prices are subject to change without notice</Text>
            <Text style={styles.bulletPoint}>• Refunds are subject to venue policies and applicable laws</Text>
            <Text style={styles.bulletPoint}>• You are responsible for any applicable taxes</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Age Restrictions & Legal Disclaimer</Text>
            <Text style={styles.sectionText}>
              You must be at least 18 years old to use this service. Tipzy helps users discover nightlife venues but does not promote underage drinking. All users must be 18 years or older to register.
            </Text>
            <Text style={styles.sectionText}>
              Users are responsible for following local laws and the entry/drinking policies of each venue, including any 21+ alcohol rules. Venues listed on our platform may have different entry requirements (18+ or 21+), which are clearly displayed on their profiles.
            </Text>
            <Text style={styles.sectionText}>
              By using this service, you acknowledge that you are responsible for verifying and complying with all applicable age restrictions, local laws, and venue policies.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Limitation of Liability</Text>
            <Text style={styles.sectionText}>
              Tipzy is not liable for any indirect, incidental, special, or consequential damages 
              arising from your use of our service. Our total liability shall not exceed the amount 
              you paid for our services in the past 12 months.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Termination</Text>
            <Text style={styles.sectionText}>
              We may terminate or suspend your account at any time for violations of these terms. 
              You may also delete your account at any time through the app settings.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Changes to Terms</Text>
            <Text style={styles.sectionText}>
              We reserve the right to modify these terms at any time. We will notify users of 
              significant changes through the app or by email. Continued use of the service 
              constitutes acceptance of the updated terms.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Contact Information</Text>
            <Text style={styles.sectionText}>
              If you have any questions about these Terms and Conditions, please contact us at:
            </Text>
            <Text style={styles.contactInfo}>Email: legal@tipzy.app</Text>
            <Text style={styles.contactInfo}>Address: [Your Business Address]</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
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
  lastUpdated: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  sectionText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    lineHeight: 24,
    marginBottom: theme.spacing.md,
  },
  bulletPoint: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    lineHeight: 24,
    marginBottom: 4,
  },
  contactInfo: {
    fontSize: 16,
    color: theme.colors.purple,
    lineHeight: 24,
    marginBottom: 4,
  },
});