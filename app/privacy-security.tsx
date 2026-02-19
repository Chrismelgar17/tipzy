import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { Stack } from 'expo-router';
import { Shield, Lock, Eye, EyeOff, Trash2, Database } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { PrivacySettings } from '@/types/models';
import { useAuth } from '@/hooks/auth-context';

export default function PrivacySecurityScreen() {
  const { changePassword, deleteAccount } = useAuth();
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    twoFactorEnabled: false,
    dataSharing: true,
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleToggleSetting = (key: keyof PrivacySettings) => {
    setPrivacySettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleChangePassword = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters long');
      return;
    }

    changePassword(passwordForm.currentPassword, passwordForm.newPassword)
      .then(() => {
        Alert.alert('Success', 'Password changed successfully');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordModal(false);
      })
      .catch((err: any) => Alert.alert('Error', err?.message ?? 'Failed to change password'));
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteAccount()
              .catch((err: any) => Alert.alert('Error', err?.message ?? 'Failed to delete account'));
            setShowDeleteModal(false);
          },
        },
      ]
    );
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Privacy & Security',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text.primary,
        }}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Shield size={32} color={theme.colors.purple} />
          <Text style={styles.headerTitle}>Privacy & Security</Text>
          <Text style={styles.headerDescription}>
            Manage your account security and privacy preferences.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => setShowPasswordModal(true)}
          >
            <View style={styles.optionLeft}>
              <View style={styles.iconContainer}>
                <Lock size={20} color={theme.colors.purple} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Change Password</Text>
                <Text style={styles.optionDescription}>Update your account password</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.optionItem}>
            <View style={styles.optionLeft}>
              <View style={styles.iconContainer}>
                <Shield size={20} color={theme.colors.purple} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Two-Factor Authentication</Text>
                <Text style={styles.optionDescription}>
                  Add an extra layer of security to your account
                </Text>
              </View>
            </View>
            <Switch
              value={privacySettings.twoFactorEnabled}
              onValueChange={() => handleToggleSetting('twoFactorEnabled')}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.purple + '40',
              }}
              thumbColor={privacySettings.twoFactorEnabled ? theme.colors.purple : theme.colors.text.tertiary}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          
          <View style={styles.optionItem}>
            <View style={styles.optionLeft}>
              <View style={styles.iconContainer}>
                <Database size={20} color={theme.colors.purple} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Data Sharing</Text>
                <Text style={styles.optionDescription}>
                  Share usage data to help improve the app
                </Text>
              </View>
            </View>
            <Switch
              value={privacySettings.dataSharing}
              onValueChange={() => handleToggleSetting('dataSharing')}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.purple + '40',
              }}
              thumbColor={privacySettings.dataSharing ? theme.colors.purple : theme.colors.text.tertiary}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity
            style={[styles.optionItem, styles.dangerOption]}
            onPress={() => setShowDeleteModal(true)}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.iconContainer, styles.dangerIconContainer]}>
                <Trash2 size={20} color={theme.colors.error} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={[styles.optionTitle, styles.dangerText]}>Delete Account</Text>
                <Text style={styles.optionDescription}>
                  Permanently delete your account and all data
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TouchableOpacity onPress={handleChangePassword}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={passwordForm.currentPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, currentPassword: text })}
                  placeholder="Enter current password"
                  secureTextEntry={!showPasswords.current}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => togglePasswordVisibility('current')}
                >
                  {showPasswords.current ? (
                    <EyeOff size={20} color={theme.colors.text.tertiary} />
                  ) : (
                    <Eye size={20} color={theme.colors.text.tertiary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={passwordForm.newPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, newPassword: text })}
                  placeholder="Enter new password"
                  secureTextEntry={!showPasswords.new}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => togglePasswordVisibility('new')}
                >
                  {showPasswords.new ? (
                    <EyeOff size={20} color={theme.colors.text.tertiary} />
                  ) : (
                    <Eye size={20} color={theme.colors.text.tertiary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={passwordForm.confirmPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, confirmPassword: text })}
                  placeholder="Confirm new password"
                  secureTextEntry={!showPasswords.confirm}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => togglePasswordVisibility('confirm')}
                >
                  {showPasswords.confirm ? (
                    <EyeOff size={20} color={theme.colors.text.tertiary} />
                  ) : (
                    <Eye size={20} color={theme.colors.text.tertiary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.passwordRequirements}>
              <Text style={styles.requirementsTitle}>Password Requirements:</Text>
              <Text style={styles.requirementsText}>
                • At least 8 characters long{'\n'}
                • Include uppercase and lowercase letters{'\n'}
                • Include at least one number{'\n'}
                • Include at least one special character
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContainer}>
            <View style={styles.deleteModalHeader}>
              <Trash2 size={32} color={theme.colors.error} />
              <Text style={styles.deleteModalTitle}>Delete Account</Text>
            </View>
            <Text style={styles.deleteModalText}>
              Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be lost.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancelButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirmButton}
                onPress={handleDeleteAccount}
              >
                <Text style={styles.deleteModalConfirmText}>Delete Account</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  dangerOption: {
    borderWidth: 1,
    borderColor: theme.colors.error + '20',
  },
  dangerIconContainer: {
    backgroundColor: theme.colors.error + '20',
  },
  dangerText: {
    color: theme.colors.error,
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
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.purple,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.card,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  eyeButton: {
    padding: theme.spacing.md,
  },
  passwordRequirements: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.purple,
    marginTop: theme.spacing.lg,
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  requirementsText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  deleteModalContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.error,
    marginTop: theme.spacing.sm,
  },
  deleteModalText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.xl,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  deleteModalCancelButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  deleteModalConfirmButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
});