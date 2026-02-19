import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { User, UserType, OnboardingState } from '@/types/models';
import { safeJsonParse, clearCorruptedData, clearAllAppData, secureStorage } from '@/utils/storage';
import { authService, type AuthUser, type UserRole } from '@/lib/auth.service';

interface AuthState {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isBusiness: boolean;
  isCustomer: boolean;

  signIn: (email: string, password: string) => Promise<void>;
  signInBusiness: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, dob: Date, phone?: string) => Promise<void>;
  signUpBusiness: (name: string, email: string, password: string, businessName: string, businessCategory?: string, phone?: string) => Promise<void>;
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

//  Role  route 

function routeForRole(role: UserRole | undefined) {
  switch (role) {
    case 'admin':    return '/admin';
    case 'business': return '/(business-tabs)/dashboard';
    default:         return '/(tabs)/home';
  }
}

//  Map AuthUser  app User 

function toAppUser(apiUser: AuthUser, extra?: Partial<User>): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.name,
    phone: apiUser.phone,
    favorites: [],
    createdAt: new Date(apiUser.createdAt),
    role: apiUser.role === 'admin' ? 'admin' : apiUser.role === 'business' ? 'business' : 'user',
    hasCompletedOnboarding: false,
    ...extra,
  };
}

//  Context 

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
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

  //  Session restore 

  const loadUser = async () => {
    try {
      const hasToken = await secureStorage.isAuthenticated();

      if (hasToken) {
        try {
          // Try refresh first so we always boot with a fresh access token
          await authService.refreshTokens();
          const stored = await authService.getStoredUser();
          if (stored) {
            setUser(toAppUser(stored));
            setRole(stored.role);
            return;
          }
        } catch {
          // Refresh failed  token truly expired
          console.warn('[Auth] Token refresh failed, clearing session');
          await secureStorage.clearAuthData();
        }
      }

      // Fallback: locally cached user (no token)
      const raw = await AsyncStorage.getItem('user');
      if (raw && (raw.startsWith('object') || raw.includes('Unexpected character'))) {
        await clearAllAppData();
        setUser(null);
        return;
      }

      const parsed = safeJsonParse<User | null>(raw, null);
      if (parsed && typeof parsed === 'object' && parsed.id && parsed.email) {
        setUser(parsed);
        const storedRole = await secureStorage.getUserData<AuthUser>();
        setRole(storedRole?.role ?? null);
      } else if (raw && raw.trim()) {
        await clearCorruptedData('user');
      }
    } catch (error) {
      console.error('[Auth] loadUser failed:', error);
      await clearAllAppData();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  //  Onboarding 

  const loadOnboardingState = async () => {
    try {
      const stored = await AsyncStorage.getItem('onboardingState');
      const defaultState: OnboardingState = { userType: null, hasCompletedOnboarding: false };
      if (stored && (stored.startsWith('object') || stored.includes('Unexpected character'))) {
        await clearCorruptedData('onboardingState');
        setOnboardingState(defaultState);
        return;
      }
      const parsed = safeJsonParse<OnboardingState>(stored, defaultState);
      if (parsed && typeof parsed === 'object') {
        setOnboardingState(parsed);
      } else if (stored && stored.trim()) {
        await clearCorruptedData('onboardingState');
        setOnboardingState(defaultState);
      }
    } catch (error) {
      console.error('[Auth] loadOnboardingState failed:', error);
      setOnboardingState({ userType: null, hasCompletedOnboarding: false });
    }
  };

  const saveOnboardingState = async (state: OnboardingState) => {
    try {
      await AsyncStorage.setItem('onboardingState', JSON.stringify(state));
      setOnboardingState(state);
    } catch (error) {
      console.error('[Auth] saveOnboardingState failed:', error);
    }
  };

  //  Auth actions 

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await authService.login(email, password);
    const appUser = toAppUser(response.user);
    setUser(appUser);
    setRole(response.user.role);
    await AsyncStorage.setItem('user', JSON.stringify(appUser));
    router.replace(routeForRole(response.user.role) as any);
  }, []);

  const signInBusiness = useCallback(async (email: string, password: string) => {
    const response = await authService.loginBusiness(email, password);
    const appUser = toAppUser(response.user);
    setUser(appUser);
    setRole(response.user.role);
    await AsyncStorage.setItem('user', JSON.stringify(appUser));
    router.replace(routeForRole(response.user.role) as any);
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string, dob: Date, phone?: string) => {
    const age = new Date().getFullYear() - dob.getFullYear();
    const response = await authService.register(name, email, password, age, phone);
    const appUser = toAppUser(response.user, { dob, phone });
    setUser(appUser);
    setRole(response.user.role);
    await AsyncStorage.setItem('user', JSON.stringify(appUser));
    router.replace(routeForRole(response.user.role) as any);
  }, []);

  const signUpBusiness = useCallback(async (
    name: string, email: string, password: string,
    businessName: string, businessCategory?: string, phone?: string,
  ) => {
    const response = await authService.registerBusiness(name, email, password, businessName, businessCategory, phone);
    const appUser = toAppUser(response.user, { phone });
    setUser(appUser);
    setRole(response.user.role);
    await AsyncStorage.setItem('user', JSON.stringify(appUser));
    router.replace(routeForRole(response.user.role) as any);
  }, []);

  const signOut = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setRole(null);
    await AsyncStorage.removeItem('user');
    router.replace('/' as any);
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
    // Backend endpoint not yet implemented  placeholder
    console.log('[Auth] Password reset requested for:', email);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!role) throw new Error('Not authenticated');
    if (role === 'business') {
      await authService.changeBusinessPassword(currentPassword, newPassword);
    } else {
      await authService.changePassword(currentPassword, newPassword);
    }
  }, [role]);

  const deleteAccount = useCallback(async () => {
    await authService.deleteAccount();
    setUser(null);
    setRole(null);
    await AsyncStorage.removeItem('user');
    router.replace('/' as any);
  }, []);

  //  Onboarding helpers 

  const hasCompletedOnboarding = user?.hasCompletedOnboarding ?? false;

  const completeOnboarding = useCallback(async () => {
    if (!user) return;
    await updateProfile({ hasCompletedOnboarding: true });
    await saveOnboardingState({ ...onboardingState, hasCompletedOnboarding: true });
  }, [user, updateProfile, onboardingState]);

  const setUserType = useCallback(async (userType: UserType) => {
    await saveOnboardingState({ ...onboardingState, userType });
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

  //  Memo 

  return useMemo(() => ({
    user,
    role,
    isLoading,
    isAuthenticated: !!user,
    isAdmin:    role === 'admin',
    isBusiness: role === 'business',
    isCustomer: role === 'customer',
    signIn,
    signInBusiness,
    signUp,
    signUpBusiness,
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
  }), [
    user, role, isLoading,
    signIn, signInBusiness, signUp, signUpBusiness, signOut,
    updateProfile, toggleFavorite, forgotPassword, changePassword, deleteAccount,
    hasCompletedOnboarding, completeOnboarding, onboardingState, setUserType,
    needsOnboarding, requireAuth, showSignInModal, signInPrompt,
  ]);
});
