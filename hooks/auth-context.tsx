import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { User, UserType, OnboardingState } from '@/types/models';
import { safeJsonParse, clearCorruptedData, clearAllAppData, secureStorage } from '@/utils/storage';
import { authService } from '@/lib/auth.service';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, dob: Date, phone?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  toggleFavorite: (venueId: string) => void;
  forgotPassword: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => Promise<void>;
  onboardingState: OnboardingState;
  setUserType: (userType: UserType) => Promise<void>;
  needsOnboarding: boolean;
  requireAuth: (action: string) => boolean;
  showSignInModal: boolean;
  setShowSignInModal: (show: boolean) => void;
  signInPrompt: string;
  setSignInPrompt: (prompt: string) => void;
}

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [signInPrompt, setSignInPrompt] = useState('Sign in to continue');
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    userType: null,
    hasCompletedOnboarding: false,
  });

  useEffect(() => {
    loadUser();
    loadOnboardingState();
  }, []);

  const loadUser = async () => {
    try {
      // First check if a JWT token is present
      const hasToken = await secureStorage.isAuthenticated();

      if (hasToken) {
        // Try to refresh the user profile from the backend
        try {
          const profile = await authService.getProfile();
          const appUser: User = {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            favorites: [],
            createdAt: new Date(profile.createdAt),
            role: (profile.role as User['role']) ?? 'user',
            hasCompletedOnboarding: false,
          };
          setUser(appUser);
          await AsyncStorage.setItem('user', JSON.stringify(appUser));
          return;
        } catch {
          // Token is expired / invalid – clear everything and fall through
          console.warn('[Auth] Token invalid, clearing auth data');
          await secureStorage.clearAuthData();
        }
      }

      // Fall back to locally cached user (no valid token)
      const stored = await AsyncStorage.getItem('user');

      if (stored && (stored.startsWith('object') || stored.includes('Unexpected character'))) {
        console.warn('Detected corrupted user data, clearing all app data');
        await clearAllAppData();
        setUser(null);
        return;
      }

      const parsed = safeJsonParse<User | null>(stored, null);

      if (parsed && typeof parsed === 'object' && parsed.id && parsed.email) {
        setUser(parsed);
      } else if (stored && stored.trim()) {
        console.warn('Invalid user data format, clearing storage');
        await clearCorruptedData('user');
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      await clearAllAppData();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOnboardingState = async () => {
    try {
      const stored = await AsyncStorage.getItem('onboardingState');
      const defaultState: OnboardingState = {
        userType: null,
        hasCompletedOnboarding: false,
      };
      
      // Handle corrupted data
      if (stored && (stored.startsWith('object') || stored.includes('Unexpected character'))) {
        console.warn('Detected corrupted onboarding data, using default');
        await clearCorruptedData('onboardingState');
        setOnboardingState(defaultState);
        return;
      }
      
      const parsed = safeJsonParse<OnboardingState>(stored, defaultState);
      
      if (parsed && typeof parsed === 'object') {
        setOnboardingState(parsed);
      } else if (stored && stored.trim()) {
        console.warn('Invalid onboarding state format, using default');
        await clearCorruptedData('onboardingState');
        setOnboardingState(defaultState);
      }
    } catch (error) {
      console.error('Failed to load onboarding state:', error);
      await clearCorruptedData('onboardingState');
      const defaultState: OnboardingState = {
        userType: null,
        hasCompletedOnboarding: false,
      };
      setOnboardingState(defaultState);
    }
  };

  const saveOnboardingState = async (state: OnboardingState) => {
    try {
      await AsyncStorage.setItem('onboardingState', JSON.stringify(state));
      setOnboardingState(state);
    } catch (error) {
      console.error('Failed to save onboarding state:', error);
    }
  };

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);

      const appUser: User = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        favorites: [],
        createdAt: new Date(response.user.createdAt),
        role: (response.user.role as User['role']) ?? 'user',
        hasCompletedOnboarding: false,
      };

      setUser(appUser);
      await AsyncStorage.setItem('user', JSON.stringify(appUser));
    } catch (error: any) {
      console.error('[signIn] Failed:', error?.message ?? error);
      throw error;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string, dob: Date, phone?: string) => {
    try {
      // Calculate age from date of birth for the backend
      const age = new Date().getFullYear() - dob.getFullYear();

      const response = await authService.register(name, email, password, age);

      const appUser: User = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        dob,
        phone,
        favorites: [],
        createdAt: new Date(response.user.createdAt),
        role: (response.user.role as User['role']) ?? 'user',
        hasCompletedOnboarding: false,
      };

      setUser(appUser);
      await AsyncStorage.setItem('user', JSON.stringify(appUser));
    } catch (error: any) {
      console.error('[signUp] Failed:', error?.message ?? error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    await authService.logout();       // clears authToken + userData
    setUser(null);
    await AsyncStorage.removeItem('user');
  }, []);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!user) return;
    
    const updated = { ...user, ...updates };
    setUser(updated);
    await AsyncStorage.setItem('user', JSON.stringify(updated));
  }, [user]);

  const toggleFavorite = useCallback((venueId: string) => {
    if (!user) {
      setSignInPrompt('Sign in to save favorites');
      setShowSignInModal(true);
      return;
    }
    
    const favorites = user.favorites.includes(venueId)
      ? user.favorites.filter(id => id !== venueId)
      : [...user.favorites, venueId];
    
    updateProfile({ favorites });
  }, [user, updateProfile]);

  const forgotPassword = useCallback(async (email: string) => {
    // Calls POST /api/customer/forgot-password when implemented on backend
    console.log('Password reset requested for:', email);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    // Calls PATCH /api/customer/password when implemented on backend
    console.log('Password change requested');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, []);

  const deleteAccount = useCallback(async () => {
    // Mock account deletion
    await signOut();
    console.log('Account deleted');
  }, [signOut]);

  const hasCompletedOnboarding = user?.hasCompletedOnboarding ?? false;

  const completeOnboarding = useCallback(async () => {
    if (!user) return;
    await updateProfile({ hasCompletedOnboarding: true });
    await saveOnboardingState({ ...onboardingState, hasCompletedOnboarding: true });
  }, [user, updateProfile, onboardingState]);

  const setUserType = useCallback(async (userType: UserType) => {
    const newState = { ...onboardingState, userType };
    await saveOnboardingState(newState);
  }, [onboardingState]);

  const needsOnboarding = !onboardingState.hasCompletedOnboarding && !user;

  const requireAuth = useCallback((action: string) => {
    if (!user) {
      setSignInPrompt(`Sign in to ${action}`);
      setShowSignInModal(true);
      return false;
    }
    return true;
  }, [user]);

  return useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    updateProfile,
    toggleFavorite,
    forgotPassword,
    changePassword,
    deleteAccount,
    hasCompletedOnboarding,
    completeOnboarding,
    onboardingState,
    setUserType,
    needsOnboarding,
    requireAuth,
    showSignInModal,
    setShowSignInModal,
    signInPrompt,
    setSignInPrompt,
  }), [user, isLoading, signIn, signUp, signOut, updateProfile, toggleFavorite, forgotPassword, changePassword, deleteAccount, hasCompletedOnboarding, completeOnboarding, onboardingState, setUserType, needsOnboarding, requireAuth, showSignInModal, signInPrompt]);
});