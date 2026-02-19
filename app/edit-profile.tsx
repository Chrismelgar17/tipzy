import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Camera, Save, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-context';
import { useAuth } from '@/hooks/auth-context';
import * as Haptics from 'expo-haptics';

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const { user, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
  });

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    if (!formData.email.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsLoading(true);
    try {
      await updateProfile({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        bio: formData.bio.trim() || undefined,
      });
      
      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoPress = () => {
    Alert.alert(
      'Change Profile Photo',
      'Photo upload is not implemented in this demo',
      [
        { text: 'Camera', onPress: () => {} },
        { text: 'Photo Library', onPress: () => {} },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    header: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    avatarContainer: {
      position: 'relative',
      marginBottom: theme.spacing.md,
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
    },
    avatarPlaceholder: {
      backgroundColor: theme.colors.purple,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      color: theme.colors.white,
      fontSize: 48,
      fontWeight: '600',
    },
    cameraButton: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.purple,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: theme.colors.background,
    },
    form: {
      gap: theme.spacing.lg,
    },
    inputGroup: {
      gap: theme.spacing.sm,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    inputContainer: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      height: 56,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    input: {
      color: theme.colors.text.primary,
      fontSize: 16,
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
      paddingTop: theme.spacing.md,
    },
    saveButton: {
      backgroundColor: theme.colors.purple,
      height: 56,
      borderRadius: theme.borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: theme.spacing.xl,
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    saveButtonText: {
      color: theme.colors.white,
      fontSize: 18,
      fontWeight: '600',
    },
    cancelButton: {
      backgroundColor: theme.colors.card,
      height: 56,
      borderRadius: theme.borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: theme.spacing.md,
      flexDirection: 'row',
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cancelButtonText: {
      color: theme.colors.text.primary,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit Profile',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text.primary,
        }}
      />
      <ScrollView 
        style={[styles.container, { paddingBottom: insets.bottom }]} 
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {user?.avatarUrl && user.avatarUrl.trim() !== '' ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{formData.name[0] || 'U'}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.cameraButton} onPress={handlePhotoPress}>
              <Camera size={18} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={theme.colors.text.tertiary}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                testID="name-input"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={theme.colors.text.tertiary}
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
                testID="email-input"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number (Optional)</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter your phone number"
                placeholderTextColor={theme.colors.text.tertiary}
                value={formData.phone}
                onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
                testID="phone-input"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio (Optional)</Text>
            <View style={[styles.inputContainer, styles.textArea]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell us about yourself..."
                placeholderTextColor={theme.colors.text.tertiary}
                value={formData.bio}
                onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
                multiline
                numberOfLines={4}
                testID="bio-input"
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isLoading}
            testID="save-button"
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <>
                <Save size={20} color={theme.colors.white} />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            testID="cancel-button"
          >
            <X size={20} color={theme.colors.text.primary} />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}