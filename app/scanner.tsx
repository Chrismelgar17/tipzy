import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, Flashlight, FlashlightOff } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useTickets } from '@/hooks/tickets-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const { validateTicket, checkInTicket } = useTickets();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const result = await validateTicket(data);
      
      if (result.valid && result.ticket) {
        Alert.alert(
          'Valid Ticket',
          `${result.ticket.eventTitle}\n${result.ticket.productName}\nHolder: ${result.ticket.userId}`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setScanned(false),
            },
            {
              text: 'Check In',
              onPress: async () => {
                await checkInTicket(result.ticket!.id);
                if (Platform.OS !== 'web') {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                Alert.alert('Success', 'Ticket checked in successfully', [
                  { text: 'OK', onPress: () => setScanned(false) },
                ]);
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Invalid Ticket',
          result.ticket?.status === 'used' 
            ? 'This ticket has already been used'
            : 'Ticket not found or invalid',
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to validate ticket', [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
    }
  };

  const handleClose = () => {
    router.back();
  };

  const toggleFlash = () => {
    setFlashOn(!flashOn);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan QR codes
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
            <X size={24} color={theme.colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Ticket</Text>
          <TouchableOpacity style={styles.headerButton} onPress={toggleFlash}>
            {flashOn ? (
              <FlashlightOff size={24} color={theme.colors.white} />
            ) : (
              <Flashlight size={24} color={theme.colors.white} />
            )}
          </TouchableOpacity>
        </View>

        {/* Scanning Area */}
        <View style={styles.scanArea}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          
          <Text style={styles.instructionText}>
            Position the QR code within the frame
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Scan the QR code on the customer&apos;s ticket
          </Text>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.white,
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: theme.colors.white,
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructionText: {
    color: theme.colors.white,
    fontSize: 16,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  footer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  footerText: {
    color: theme.colors.white,
    fontSize: 14,
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  permissionButton: {
    backgroundColor: theme.colors.purple,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  permissionButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});