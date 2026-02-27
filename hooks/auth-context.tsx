import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, UserType, OnboardingState } from '@/types/models';
import { safeJsonParse, clearCorruptedData, clearAllAppData, secureStorage } from '@/utils/storage';
import { authService, type AuthUser, type UserRole, type SocialAuthProvider } from '@/lib/auth.service';
import { setSessionExpiredHandler } from '@/lib/api';
import { nativeGoogleSignOut } from '@/lib/google-signin';

interface AuthState {
  user: User | null;
  role: UserRole | null;
  emailVerified: boolean;
  pendingVerificationEmail: string | null;
  verificationToken: string | null;
  verificationPreviewUrl: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isBusiness: boolean;
  isCustomer: boolean;
  /** 'pending' | 'approved' | 'rejected' | null – only meaningful when role === 'business' */
  businessStatus: 'pending' | 'approved' | 'rejected' | null;

  signIn: (email: string, password: string) => Promise<void>;
  signInWithProvider: (provider: SocialAuthProvider, details: { email?: string; name?: string; phone?: string; providerSubject?: string; idToken?: string; accessToken?: string }) => Promise<void>;
  signInBusiness: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, dob: Date, phone?: string) => Promise<void>;
  signUpBusiness: (name: string, email: string, password: string, businessName: string, businessCategory?: string, phone?: string) => Promise<void>;
  upgradeAccountToBusiness: (
    businessName: string,
    businessCategory?: string,
    phone?: string,
    venueData?: {
      address?: string;
      capacity?: number;
      minAge?: number;
      hours?: Record<string, { open: string; close: string }>;
      genres?: string[];
      photos?: string[];
    },
  ) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  toggleFavorite: (venueId: string) => void;
  forgotPassword: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (emailOverride?: string) => Promise<void>;
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

function routeForRole(role: UserRole | undefined, businessStatus?: string) {
  if (role === 'admin') return '/admin';
  if (role === 'business') {
    return businessStatus === 'approved' ? '/(business-tabs)/dashboard' : '/(tabs)/home';
  }
  return '/(tabs)/home';
}

//  Map AuthUser  app User 

function toAppUser(apiUser: AuthUser, extra?: Partial<User>): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.name,
    phone: apiUser.phone,
    avatarUrl: apiUser.avatarUrl,
    bio: (apiUser as any).bio,
    favorites: [],
    createdAt: new Date(apiUser.createdAt),
    role: apiUser.role === 'admin' ? 'admin' : apiUser.role === 'business' ? 'business' : 'user',
    emailVerified: apiUser.emailVerified ?? false,
    hasCompletedOnboarding: false,
    businessStatus: apiUser.businessStatus,
    ...extra,
  };
}

//  Context 

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [user, setUser] = useState<User | null>(null);
  // Keep a ref so callbacks like updateProfile & toggleFavorite never
  // need [user] as a dependency — preventing cascading re-renders on every
  // favorites toggle.
  const userRef = useRef<User | null>(null);
  useEffect(() => { userRef.current = user; }, [user]);
  const [role, setRole] = useState<UserRole | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [verificationPreviewUrl, setVerificationPreviewUrl] = useState<string | null>(null);
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
    // When the API interceptor fails to refresh a token, force a full sign-out
    // so isAuthenticated flips to false and the user is sent to the login screen.
    setSessionExpiredHandler(() => {
      setUser(null);
      setRole(null);
      router.replace('/(auth)/signin' as any);
    });
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
            let mapped = toAppUser(stored);
            // Always fetch fresh profile so server-side changes (e.g. business approval,
            // email verification) are reflected immediately on app startup.
            try {
              const fresh = await authService.getProfile();
              mapped = toAppUser(fresh);
              await secureStorage.saveUserData(fresh);
            } catch {
              // If profile fetch fails, fall back to stored data
              if (!mapped.emailVerified) {
                setPendingVerificationEmail(mapped.email);
              }
            }
            // Restore favorites from local AsyncStorage cache (not in AuthUser shape)
            try {
              const raw = await AsyncStorage.getItem('user');
              const cached = safeJsonParse<User | null>(raw, null);
              if (cached?.favorites?.length) {
                mapped = { ...mapped, favorites: cached.favorites };
              }
            } catch { /* ignore */ }
            setUser(mapped);
            setRole(mapped.role as UserRole);
            if (!mapped.emailVerified) setPendingVerificationEmail(mapped.email);
            return;
          }
        } catch {
          // Refresh failed – token truly expired, must sign in again
          console.warn('[Auth] Token refresh failed, clearing session');
          await secureStorage.clearAuthData();
          await AsyncStorage.removeItem('user');
          setUser(null);
          setRole(null);
          return;
        }
      }

      // Fallback: locally cached user (no token — legacy path, no active session)
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
        if (!parsed.emailVerified) setPendingVerificationEmail(parsed.email);
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
    try {
      const response = await authService.loginAny(email, password);
      let appUser = toAppUser(response.user);

      // If backend says unverified, double-check with profile to avoid stale state
      if (!appUser.emailVerified) {
        try {
          const fresh = await authService.getProfile();
          appUser = toAppUser(fresh);
        } catch {
          // ignore fetch errors; fall back to login payload
        }
      }

      setUser(appUser);
      setRole(appUser.role === 'business' ? 'business' : appUser.role === 'admin' ? 'admin' : 'customer');
      await AsyncStorage.setItem('user', JSON.stringify(appUser));

      if (!appUser.emailVerified) {
        setPendingVerificationEmail(appUser.email);
        router.replace({ pathname: '/(auth)/verify-email', params: { email: appUser.email } } as any);
        return;
      }
      setPendingVerificationEmail(null);
      setVerificationToken(null);
      setVerificationPreviewUrl(null);
      router.replace(routeForRole(appUser.role as UserRole, appUser.businessStatus) as any);
    } catch (error: any) {
      const message = error?.message?.toLowerCase?.() || '';
      if (message.includes('verify')) {
        setPendingVerificationEmail(email);
        router.replace({ pathname: '/(auth)/verify-email', params: { email } } as any);
        return;
      }
      throw error;
    }
  }, []);

  const signInWithProvider = useCallback(async (
    provider: SocialAuthProvider,
    details: { email?: string; name?: string; phone?: string; providerSubject?: string; idToken?: string; accessToken?: string },
  ) => {
    const response = await authService.loginWithProvider(provider, details);
    const appUser = toAppUser(response.user, { phone: response.user.phone });
    setUser(appUser);
    setRole(response.user.role);
    setPendingVerificationEmail(null);
    setVerificationToken(null);
    setVerificationPreviewUrl(null);
    await AsyncStorage.setItem('user', JSON.stringify(appUser));
    // Defer navigation so React commits setUser before the destination screen mounts.
    // Navigate to profile for customers (most social sign-ins happen from the Profile tab).
    setTimeout(() => {
      const role = response.user.role;
      if (role === 'admin') {
        router.replace('/admin' as any);
      } else if (role === 'business') {
        router.replace((response.user.businessStatus === 'approved' ? '/(business-tabs)/dashboard' : '/(tabs)/home') as any);
      } else {
        router.replace('/(tabs)/profile' as any);
      }
    }, 50);
  }, []);

  const signInBusiness = useCallback(async (email: string, password: string) => {
    const response = await authService.loginBusiness(email, password);
    const appUser = toAppUser(response.user);
    await secureStorage.saveToken(response.token);
    await secureStorage.saveRefreshToken(response.refreshToken);
    await secureStorage.saveUserData(response.user);
    setUser(appUser);
    setRole(response.user.role);
    await AsyncStorage.setItem('user', JSON.stringify(appUser));
    router.replace(routeForRole(response.user.role, response.user.businessStatus) as any);
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string, dob: Date, phone?: string) => {
    const age = new Date().getFullYear() - dob.getFullYear();
    const response = await authService.register(name, email, password, age, phone);
    const appUser = toAppUser(response.user, { dob, phone });
    await secureStorage.saveToken(response.token);
    await secureStorage.saveRefreshToken(response.refreshToken);
    await secureStorage.saveUserData(response.user);
    setUser(appUser);
    setRole(response.user.role);
    await AsyncStorage.setItem('user', JSON.stringify(appUser));
    if (!appUser.emailVerified) {
      setPendingVerificationEmail(appUser.email);
      setVerificationToken(response.verificationToken ?? null);
      setVerificationPreviewUrl(response.mailPreviewUrl ?? null);
      router.replace({ pathname: '/(auth)/verify-email', params: { email: appUser.email } } as any);
      return;
    }
    router.replace(routeForRole(response.user.role) as any);
  }, []);

  const signUpBusiness = useCallback(async (
    name: string, email: string, password: string,
    businessName: string, businessCategory?: string, phone?: string,
  ) => {
    const response = await authService.registerBusiness(name, email, password, businessName, businessCategory, phone);
    const appUser = toAppUser(response.user, { phone });
    await secureStorage.saveToken(response.token);
    await secureStorage.saveRefreshToken(response.refreshToken);
    await secureStorage.saveUserData(response.user);
    setUser(appUser);
    setRole(response.user.role);
    await AsyncStorage.setItem('user', JSON.stringify(appUser));
    if (!appUser.emailVerified) {
      setPendingVerificationEmail(appUser.email);
      setVerificationToken(response.verificationToken ?? null);
      setVerificationPreviewUrl(response.mailPreviewUrl ?? null);
      router.replace({ pathname: '/(auth)/verify-email', params: { email: appUser.email } } as any);
      return;
    }
    router.replace(routeForRole(response.user.role, response.user.businessStatus) as any);
  }, []);

  const upgradeAccountToBusiness = useCallback(async (
    businessName: string,
    businessCategory?: string,
    phone?: string,
    venueData?: {
      address?: string;
      capacity?: number;
      minAge?: number;
      hours?: Record<string, { open: string; close: string }>;
      genres?: string[];
      photos?: string[];
    },
  ) => {
    // Proactively refresh so _memToken is guaranteed fresh for the upgrade call
    try {
      await authService.refreshTokens();
    } catch {
      // Refresh truly failed – clear session and send to login
      await secureStorage.clearAuthData();
      await AsyncStorage.removeItem('user');
      setUser(null);
      setRole(null);
      router.replace('/(auth)/signin' as any);
      throw new Error('Session expired. Please sign in again.');
    }
    const response = await authService.upgradeAccountToBusiness(businessName, businessCategory, phone, venueData);
    const appUser = toAppUser(response.user);
    await secureStorage.saveToken(response.token);
    await secureStorage.saveRefreshToken(response.refreshToken);
    await secureStorage.saveUserData(response.user);
    setUser(appUser);
    setRole('business');
    await AsyncStorage.setItem('user', JSON.stringify(appUser));
    // Business is always 'pending' right after upgrade — route to user tabs.
    // The business dashboard becomes available after admin approval on next sign-in.
    setTimeout(() => {
      router.replace('/(tabs)/home' as any);
    }, 50);
  }, []);

  const signOut = useCallback(async () => {
    // Sign out from native Google SDK (no-op if user signed in via email)
    await nativeGoogleSignOut();
    await authService.logout();
    setUser(null);
    setRole(null);
    await AsyncStorage.removeItem('user');
    router.replace('/' as any);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    setUser(updated);
    await AsyncStorage.setItem('user', JSON.stringify(updated));
    // Sync to backend if it's a real user field
    try {
      if (updates.name !== undefined || updates.phone !== undefined || updates.bio !== undefined || updates.avatarUrl !== undefined) {
        await authService.updateUserProfile({
          name: updates.name,
          phone: updates.phone,
          bio: updates.bio,
          avatarUrl: updates.avatarUrl,
        });
      }
    } catch (e) {
      console.warn('[Auth] updateProfile sync failed:', e);
    }
  }, []); // stable — reads user via ref, never recreated

  const toggleFavorite = useCallback((venueId: string) => {
    const currentUser = userRef.current;
    if (!currentUser) {
      setSignInPrompt('Sign in to save favorites');
      setShowSignInModal(true);
      return;
    }
    const favorites = currentUser.favorites.includes(venueId)
      ? currentUser.favorites.filter(id => id !== venueId)
      : [...currentUser.favorites, venueId];
    updateProfile({ favorites });
  }, [updateProfile]);

  const forgotPassword = useCallback(async (email: string) => {
    // Backend endpoint not yet implemented  placeholder
    console.log('[Auth] Password reset requested for:', email);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, []);

  const verifyEmail = useCallback(async (token: string) => {
    await authService.verifyEmail(token);
    const profile = await authService.getProfile();
    const mapped = toAppUser(profile);
    setUser(mapped);
    setRole(profile.role);
    setPendingVerificationEmail(null);
    setVerificationToken(null);
    setVerificationPreviewUrl(null);
    await AsyncStorage.setItem('user', JSON.stringify(mapped));
    router.replace(routeForRole(profile.role, profile.businessStatus) as any);
  }, []);

  const resendVerification = useCallback(async (emailOverride?: string) => {
    const res = await authService.requestVerification(emailOverride ?? pendingVerificationEmail ?? undefined);
    setVerificationToken(res.verificationToken ?? null);
    setVerificationPreviewUrl(res.mailPreviewUrl ?? null);
  }, [pendingVerificationEmail]);

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
    emailVerified: user?.emailVerified ?? false,
    pendingVerificationEmail,
    verificationToken,
    verificationPreviewUrl,
    isLoading,
    isAuthenticated: !!user,
    isAdmin:    role === 'admin',
    isBusiness: role === 'business' && user?.businessStatus === 'approved',
    isCustomer: role === 'customer' || (role === 'business' && user?.businessStatus !== 'approved'),
    businessStatus: (user?.businessStatus ?? null) as 'pending' | 'approved' | 'rejected' | null,
    signIn,
    signInWithProvider,
    signInBusiness,
    signUp,
    signUpBusiness,
    upgradeAccountToBusiness,
    signOut,
    updateProfile,
    toggleFavorite,
    forgotPassword,
    changePassword,
    verifyEmail,
    resendVerification,
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
    signIn, signInWithProvider, signInBusiness, signUp, signUpBusiness, upgradeAccountToBusiness, signOut,
    updateProfile, toggleFavorite, forgotPassword, changePassword, verifyEmail, resendVerification, deleteAccount,
    hasCompletedOnboarding, completeOnboarding, onboardingState, setUserType,
    needsOnboarding, requireAuth, showSignInModal, signInPrompt,
  ]);
});
