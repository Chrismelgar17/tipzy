import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PartyPopper, Building2 } from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function UserTypeSelectionScreen() {
  const { theme } = useTheme();
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslateY = useRef(new Animated.Value(50)).current;
  const customerGlow = useRef(new Animated.Value(0.7)).current;
  const businessGlow = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    // Logo animation
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Buttons animation
    Animated.sequence([
      Animated.delay(800),
      Animated.parallel([
        Animated.timing(buttonsOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(buttonsTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Pulsing glow animations
    const createPulseAnimation = (animatedValue: Animated.Value) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0.7,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const customerPulse = createPulseAnimation(customerGlow);
    const businessPulse = createPulseAnimation(businessGlow);
    
    customerPulse.start();
    businessPulse.start();

    return () => {
      customerPulse.stop();
      businessPulse.stop();
    };
  }, []);

  const handleCustomerPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/(auth)/signin');
  };

  const handleBusinessPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/onboarding/business-signin');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    backgroundGradient: {
      flex: 1,
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    content: {
      flex: 1,
      padding: theme.spacing.xl,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl * 2,
    },
    logoContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
      shadowColor: theme.colors.purple,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 10,
    },
    logoGradient: {
      width: '100%',
      height: '100%',
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoImage: {
      width: 70,
      height: 70,
      resizeMode: 'contain',
    },
    title: {
      fontSize: 42,
      fontWeight: '800',
      color: theme.colors.white,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
      textShadowColor: 'rgba(108, 92, 231, 0.5)',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 10,
    },
    subtitle: {
      fontSize: 18,
      color: 'rgba(255, 255, 255, 0.8)',
      textAlign: 'center',
      lineHeight: 26,
      fontWeight: '500',
    },
    optionsContainer: {
      width: '100%',
      gap: theme.spacing.xl,
      paddingHorizontal: theme.spacing.md,
    },
    optionButton: {
      borderRadius: theme.borderRadius.full,
      overflow: 'hidden',
    },
    optionGradient: {
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      minHeight: 70,
    },
    optionIcon: {
      marginRight: theme.spacing.md,
    },
    optionContent: {
      flex: 1,
      alignItems: 'center',
    },
    optionTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.white,
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    glowEffect: {
      position: 'absolute',
      top: -10,
      left: -10,
      right: -10,
      bottom: -10,
      borderRadius: theme.borderRadius.full + 10,
      opacity: 0.3,
    },
    bubbleEffect: {
      position: 'absolute',
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    bubble1: {
      top: '20%',
      left: '10%',
    },
    bubble2: {
      top: '60%',
      right: '15%',
    },
    bubble3: {
      top: '40%',
      left: '80%',
    },
    bubble4: {
      top: '80%',
      left: '20%',
    },
    bubble5: {
      top: '30%',
      right: '30%',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Dark gradient background with nightlife theme */}
      <LinearGradient
        colors={['#0B0B0F', '#1A0B2E', '#2D1B69', '#0B0B0F']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Floating bubble effects */}
      <View style={[styles.bubbleEffect, styles.bubble1]} />
      <View style={[styles.bubbleEffect, styles.bubble2]} />
      <View style={[styles.bubbleEffect, styles.bubble3]} />
      <View style={[styles.bubbleEffect, styles.bubble4]} />
      <View style={[styles.bubbleEffect, styles.bubble5]} />
      
      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          {/* Logo with neon glow */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[theme.colors.purple, theme.colors.cyan, theme.colors.purple]}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Image 
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/ovl9x2109vlvwihmnxzg0' }}
                style={styles.logoImage}
              />
            </LinearGradient>
          </View>
          
          <Text style={styles.title}>Welcome to Tipzy</Text>
          <Text style={styles.subtitle}>
            Your Nightlife Starts Here
          </Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.optionsContainer,
            {
              opacity: buttonsOpacity,
              transform: [{ translateY: buttonsTranslateY }],
            },
          ]}
        >
          {/* Customer Button with Purple Glow */}
          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleCustomerPress}
            testID="customer-option"
          >
            <Animated.View
              style={[
                styles.glowEffect,
                {
                  backgroundColor: theme.colors.purple,
                  opacity: customerGlow,
                },
              ]}
            />
            <LinearGradient
              colors={['#8B5CF6', '#A855F7', '#9333EA']}
              style={styles.optionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.optionIcon}>
                <PartyPopper size={28} color={theme.colors.white} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Customer</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Business Button with Blue Glow */}
          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleBusinessPress}
            testID="business-option"
          >
            <Animated.View
              style={[
                styles.glowEffect,
                {
                  backgroundColor: theme.colors.cyan,
                  opacity: businessGlow,
                },
              ]}
            />
            <LinearGradient
              colors={['#06B6D4', '#0891B2', '#0E7490']}
              style={styles.optionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.optionIcon}>
                <Building2 size={28} color={theme.colors.white} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Business</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}