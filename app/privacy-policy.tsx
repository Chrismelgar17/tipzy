import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Stack } from 'expo-router';
import { Shield } from 'lucide-react-native';
import { theme } from '@/constants/theme';

export default function PrivacyPolicyScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Privacy Policy',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text.primary,
        }}
      />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Shield size={32} color={theme.colors.purple} />
            <Text style={styles.headerTitle}>Privacy Policy</Text>
            <Text style={styles.lastUpdated}>Last updated: January 2025</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Information We Collect</Text>
            <Text style={styles.sectionText}>
              We collect information you provide directly to us, such as when you create an account, 
              update your profile, make purchases, or contact us for support.
            </Text>
            <Text style={styles.subsectionTitle}>Personal Information:</Text>
            <Text style={styles.bulletPoint}>• Name and email address</Text>
            <Text style={styles.bulletPoint}>• Phone number</Text>
            <Text style={styles.bulletPoint}>• Profile photo</Text>
            <Text style={styles.bulletPoint}>• Payment information</Text>
            <Text style={styles.subsectionTitle}>Location Information:</Text>
            <Text style={styles.bulletPoint}>• GPS location (when you allow location access)</Text>
            <Text style={styles.bulletPoint}>• Venue check-ins and preferences</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
            <Text style={styles.sectionText}>
              We use the information we collect to provide, maintain, and improve our services:
            </Text>
            <Text style={styles.bulletPoint}>• Process transactions and send confirmations</Text>
            <Text style={styles.bulletPoint}>• Provide customer support</Text>
            <Text style={styles.bulletPoint}>• Send important updates about your account</Text>
            <Text style={styles.bulletPoint}>• Show you nearby venues and events</Text>
            <Text style={styles.bulletPoint}>• Improve our app and services</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Information Sharing</Text>
            <Text style={styles.sectionText}>
              We do not sell, trade, or otherwise transfer your personal information to third parties 
              without your consent, except as described in this policy:
            </Text>
            <Text style={styles.bulletPoint}>• With venues when you make bookings or purchases</Text>
            <Text style={styles.bulletPoint}>• With payment processors to complete transactions</Text>
            <Text style={styles.bulletPoint}>• When required by law or to protect our rights</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Data Security</Text>
            <Text style={styles.sectionText}>
              We implement appropriate security measures to protect your personal information against 
              unauthorized access, alteration, disclosure, or destruction. However, no method of 
              transmission over the internet is 100% secure.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Your Rights</Text>
            <Text style={styles.sectionText}>
              You have the right to:
            </Text>
            <Text style={styles.bulletPoint}>• Access your personal information</Text>
            <Text style={styles.bulletPoint}>• Correct inaccurate information</Text>
            <Text style={styles.bulletPoint}>• Delete your account and personal data</Text>
            <Text style={styles.bulletPoint}>• Opt out of marketing communications</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Age Verification & Compliance</Text>
            <Text style={styles.sectionText}>
              We collect and verify age information to ensure compliance with legal requirements. 
              Users must be at least 18 years old to use our service. We do not knowingly collect 
              personal information from individuals under 18.
            </Text>
            <Text style={styles.sectionText}>
              Age verification information is used solely for compliance purposes and is not shared 
              with third parties except as required by law.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Location Services</Text>
            <Text style={styles.sectionText}>
              Our app uses location services to show you nearby venues and events. You can disable 
              location access at any time through your device settings, though this may limit some 
              app functionality.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Contact Us</Text>
            <Text style={styles.sectionText}>
              If you have any questions about this Privacy Policy, please contact us at:
            </Text>
            <Text style={styles.contactInfo}>Email: privacy@tipzy.app</Text>
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
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
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