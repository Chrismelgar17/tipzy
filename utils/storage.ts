import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Secure storage helpers for JWT auth ────────────────────────────────────

const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_DATA: 'userData',
} as const;

// In-memory cache — survives JS execution but resets on full app restart.
// Populated on every saveToken call so the API interceptor never has to
// wait on an AsyncStorage read after the first login / token refresh.
let _memToken: string | null = null;

export const secureStorage = {
  /** Persist the JWT access token (in-memory + AsyncStorage) */
  saveToken: async (token: string | null | undefined): Promise<boolean> => {
    if (token == null || token === '') {
      console.warn('[secureStorage] saveToken called with empty value – skipping');
      return false;
    }
    try {
      _memToken = token;
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      return true;
    } catch (error) {
      console.error('Error saving token:', error);
      return false;
    }
  },

  /** Retrieve the stored JWT access token (in-memory first, then AsyncStorage) */
  getToken: async (): Promise<string | null> => {
    if (_memToken) return _memToken;
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (stored) _memToken = stored;
      return stored;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  /** Persist serialised user data */
  saveUserData: async (userData: object | null | undefined): Promise<boolean> => {
    if (userData == null) {
      console.warn('[secureStorage] saveUserData called with null/undefined – skipping');
      return false;
    }
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error('Error saving user data:', error);
      return false;
    }
  },

  /** Retrieve and deserialise user data */
  getUserData: async <T = object>(): Promise<T | null> => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return data ? (JSON.parse(data) as T) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  },

  /** Persist the JWT refresh token */
  saveRefreshToken: async (token: string | null | undefined): Promise<boolean> => {
    if (token == null || token === '') {
      console.warn('[secureStorage] saveRefreshToken called with empty value – skipping');
      return false;
    }
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
      return true;
    } catch (error) {
      console.error('Error saving refresh token:', error);
      return false;
    }
  },

  /** Retrieve the stored JWT refresh token */
  getRefreshToken: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  },

  /** Remove both the token and user data (e.g. on logout) */
  clearAuthData: async (): Promise<boolean> => {
    try {
      _memToken = null;
      await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.REFRESH_TOKEN, STORAGE_KEYS.USER_DATA]);
      return true;
    } catch (error) {
      console.error('Error clearing auth data:', error);
      return false;
    }
  },

  /** Returns true if a token exists in storage */
  isAuthenticated: async (): Promise<boolean> => {
    const token = await secureStorage.getToken();
    return !!token;
  },
};

// ── General-purpose helpers ─────────────────────────────────────────────────

/**
 * Safely parse JSON from AsyncStorage with comprehensive error handling
 */
export const safeJsonParse = <T>(jsonString: string | null, fallback: T): T => {
  if (!jsonString || jsonString.trim() === '' || jsonString === 'undefined' || jsonString === 'null') {
    return fallback;
  }

  try {
    // Check if the string looks like valid JSON
    const trimmed = jsonString.trim();
    
    // Handle common corrupted data patterns
    if (trimmed === 'object' || trimmed === 'object Object' || trimmed.startsWith('object') || trimmed.includes('Unexpected character')) {
      console.warn('Detected corrupted object string, using fallback');
      return fallback;
    }
    
    // Check for other invalid patterns
    if (trimmed.length < 2 || (!trimmed.startsWith('{') && !trimmed.startsWith('[') && !trimmed.startsWith('"') && !trimmed.startsWith('true') && !trimmed.startsWith('false') && !trimmed.match(/^-?\d/))) {
      console.warn('Invalid JSON format detected, using fallback');
      return fallback;
    }

    const parsed = JSON.parse(trimmed);
    
    // Additional validation for objects
    if (parsed === null || parsed === undefined) {
      return fallback;
    }

    return parsed as T;
  } catch (error) {
    console.error('JSON parse error:', error, 'Raw string:', jsonString?.substring(0, 100));
    return fallback;
  }
};

/**
 * Safely get and parse data from AsyncStorage
 */
export const safeStorageGet = async <T>(key: string, fallback: T): Promise<T> => {
  try {
    const stored = await AsyncStorage.getItem(key);
    return safeJsonParse(stored, fallback);
  } catch (error) {
    console.error(`Failed to get ${key} from storage:`, error);
    return fallback;
  }
};

/**
 * Safely set data to AsyncStorage with JSON stringification
 */
export const safeStorageSet = async (key: string, value: any): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to set ${key} to storage:`, error);
    throw error;
  }
};

/**
 * Clear potentially corrupted data from AsyncStorage
 */
export const clearCorruptedData = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`Cleared potentially corrupted data for key: ${key}`);
  } catch (error) {
    console.error(`Failed to clear corrupted data for ${key}:`, error);
  }
};

/**
 * Clear all app data from AsyncStorage (emergency reset)
 */
export const clearAllAppData = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const appKeys = keys.filter(key => 
      key.startsWith('user') || 
      key === 'authToken' ||
      key === 'refreshToken' ||
      key === 'userData' ||
      key.startsWith('tickets_') || 
      key.startsWith('orders_') || 
      key.startsWith('messages_') || 
      key === 'chats' || 
      key === 'onboardingState' || 
      key === 'businessProfile' || 
      key === 'theme'
    );
    
    if (appKeys.length > 0) {
      await AsyncStorage.multiRemove(appKeys);
      console.log('Cleared all app data from storage');
    }
  } catch (error) {
    console.error('Failed to clear all app data:', error);
  }
};