import type { AxiosError } from 'axios';
import api from './api';
import { secureStorage } from '@/utils/storage';

type ApiError = AxiosError<{ error?: string; message?: string }>;

// ── Response shape from the backend ────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  age?: number;
  role: string;
  createdAt: string;
}

export interface AuthResponse {
  message: string;
  user: AuthUser;
  token: string;
}

// ── Auth service ────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Register a new customer account.
   * POST /api/customer/register
   */
  register: async (
    name: string,
    email: string,
    password: string,
    age?: number,
  ): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/customer/register', {
        name,
        email,
        password,
        age,
      });

      const { user, token } = response.data;

      if (!token || !user) {
        console.error('[authService] register: unexpected response shape:', response.data);
        throw new Error(
          `Unexpected response from server (missing token/user). Got: ${JSON.stringify(response.data).slice(0, 200)}`
        );
      }

      await secureStorage.saveToken(token);
      await secureStorage.saveUserData(user);

      return response.data;
    } catch (error) {
      throw handleAuthError(error as ApiError);
    }
  },

  /**
   * Login with email and password.
   * POST /api/customer/login
   */
  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/customer/login', {
        email,
        password,
      });

      const { user, token } = response.data;

      if (!token || !user) {
        console.error('[authService] login: unexpected response shape:', response.data);
        throw new Error(
          `Unexpected response from server (missing token/user). Got: ${JSON.stringify(response.data).slice(0, 200)}`
        );
      }

      await secureStorage.saveToken(token);
      await secureStorage.saveUserData(user);

      return response.data;
    } catch (error) {
      throw handleAuthError(error as ApiError);
    }
  },

  /**
   * Get the currently authenticated customer's profile.
   * GET /api/customer/me  (requires Bearer token)
   */
  getProfile: async (): Promise<AuthUser> => {
    try {
      const response = await api.get<AuthUser>('/customer/me');

      // Keep cached user data fresh
      await secureStorage.saveUserData(response.data);

      return response.data;
    } catch (error) {
      throw handleAuthError(error as ApiError);
    }
  },

  /**
   * Logout – clears all locally stored auth data.
   */
  logout: async (): Promise<void> => {
    await secureStorage.clearAuthData();
  },

  /**
   * Returns true if a token is present in storage.
   */
  isAuthenticated: async (): Promise<boolean> => {
    return secureStorage.isAuthenticated();
  },
};

// ── Error handling ──────────────────────────────────────────────────────────

function handleAuthError(error: ApiError): Error {
  if (error.response) {
    const { status, data } = error.response;
    switch (status) {
      case 400:
        return new Error(data?.error ?? 'Invalid input');
      case 401:
        return new Error('Invalid email or password');
      case 403:
        return new Error('Not a customer account');
      case 409:
        return new Error('Email already exists');
      default:
        return new Error(data?.error ?? 'Authentication failed');
    }
  } else if (error.request) {
    return new Error('Network error. Please check your connection.');
  }
  return new Error(error.message ?? 'An unexpected error occurred');
}

/**
 * Generic API error handler – maps HTTP status codes to user-friendly messages.
 */
export const handleApiError = (error: ApiError): string => {
  if (error.response) {
    const { status, data } = error.response;
    switch (status) {
      case 400: return data?.error ?? 'Invalid input';
      case 401: return 'Please login to continue';
      case 403: return "You don't have permission to perform this action";
      case 404: return 'Resource not found';
      case 409: return 'This resource already exists';
      case 500: return 'Server error. Please try again later';
      default:  return data?.error ?? 'An error occurred';
    }
  } else if (error.request) {
    return 'Network error. Please check your connection';
  }
  return 'An unexpected error occurred';
};
