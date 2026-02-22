import type { AxiosError } from "axios";
import api from "./api";
import { secureStorage } from "@/utils/storage";

type ApiError = AxiosError<{ error?: string; message?: string }>;

//  Response shapes ─

export type UserRole = "customer" | "business" | "admin";
export type SocialAuthProvider = "google" | "apple" | "phone";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  age?: number;
  phone?: string;
  role: UserRole;
  createdAt: string;
  emailVerified?: boolean;
  // Business-specific
  businessName?: string;
  businessCategory?: string;
  businessStatus?: "pending" | "approved" | "rejected";
}

export interface AuthResponse {
  message: string;
  user: AuthUser;
  token: string;
  refreshToken: string;
  verificationToken?: string;
  mailPreviewUrl?: string;
}

export interface TokenRefreshResponse {
  token: string;
  refreshToken: string;
}

export interface ProviderAuthPayload {
  email?: string;
  name?: string;
  phone?: string;
  providerSubject?: string;
  idToken?: string;
  accessToken?: string;
}

//  Helpers 

async function saveSession(token: string, refreshToken: string, user: AuthUser) {
  await secureStorage.saveToken(token);
  await secureStorage.saveRefreshToken(refreshToken);
  await secureStorage.saveUserData(user);
}

//  Auth service 

export const authService = {

  //  Customer 

  register: async (name: string, email: string, password: string, age?: number, phone?: string): Promise<AuthResponse> => {
    try {
      const { data } = await api.post<AuthResponse>("/customer/register", { name, email, password, age, phone });
      if (!data.token || !data.user) throw new Error("Unexpected response from server");
      await saveSession(data.token, data.refreshToken, data.user);
      return data;
    } catch (e) { throw handleAuthError(e as ApiError); }
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const { data } = await api.post<AuthResponse>("/customer/login", { email, password });
      if (!data.token || !data.user) throw new Error("Unexpected response from server");
      await saveSession(data.token, data.refreshToken, data.user);
      return data;
    } catch (e) { throw handleAuthError(e as ApiError); }
  },

  /** Try customer login; if the account is a business/admin, fall back to business login. */
  loginAny: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const { data } = await api.post<AuthResponse>("/customer/login", { email, password });
      if (!data.token || !data.user) throw new Error("Unexpected response from server");
      await saveSession(data.token, data.refreshToken, data.user);
      return data;
    } catch (e) {
      const err = e as ApiError;
      const status = err?.response?.status;
      const msg = (err?.response?.data as any)?.error ?? '';
      // 403 "Not a customer account" => try business login
      if (status === 403 && msg.toLowerCase().includes('customer')) {
        try {
          const { data } = await api.post<AuthResponse>("/business/login", { email, password });
          if (!data.token || !data.user) throw new Error("Unexpected response from server");
          await saveSession(data.token, data.refreshToken, data.user);
          return data;
        } catch (bizErr) { throw handleAuthError(bizErr as ApiError); }
      }
      throw handleAuthError(err);
    }
  },

  loginWithProvider: async (provider: SocialAuthProvider, payload: ProviderAuthPayload): Promise<AuthResponse> => {
    try {
      const { data } = await api.post<AuthResponse>("/customer/provider-auth", { provider, ...payload });
      if (!data.token || !data.user) throw new Error("Unexpected response from server");
      await saveSession(data.token, data.refreshToken, data.user);
      return data;
    } catch (e) { throw handleAuthError(e as ApiError); }
  },

  getProfile: async (): Promise<AuthUser> => {
    try {
      const { data } = await api.get<AuthUser>("/customer/me");
      await secureStorage.saveUserData(data);
      return data;
    } catch (e) { throw handleAuthError(e as ApiError); }
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      await api.post("/customer/change-password", { currentPassword, newPassword });
    } catch (e) { throw handleAuthError(e as ApiError); }
  },

  requestVerification: async (email?: string): Promise<{ verificationToken?: string; mailPreviewUrl?: string }> => {
    try {
      const payload = email ? { email } : {};
      const { data } = await api.post<{ message: string; verificationToken?: string; mailPreviewUrl?: string }>("/customer/request-verification", payload);
      return { verificationToken: data.verificationToken, mailPreviewUrl: (data as any).mailPreviewUrl };
    } catch (e) { throw handleAuthError(e as ApiError); }
  },

  verifyEmail: async (token: string): Promise<void> => {
    try {
      await api.post("/customer/verify", { token });
      const stored = await secureStorage.getUserData<AuthUser>();
      if (stored) {
        stored.emailVerified = true;
        await secureStorage.saveUserData(stored);
      }
    } catch (e) { throw handleAuthError(e as ApiError); }
  },

  deleteAccount: async (): Promise<void> => {
    try {
      await api.delete("/customer/account");
      await secureStorage.clearAuthData();
    } catch (e) { throw handleAuthError(e as ApiError); }
  },

  //  Business 

  registerBusiness: async (
    name: string, email: string, password: string,
    businessName: string, businessCategory?: string, phone?: string,
  ): Promise<AuthResponse> => {
    try {
      const { data } = await api.post<AuthResponse>("/business/register", { name, email, password, businessName, businessCategory, phone });
      if (!data.token || !data.user) throw new Error("Unexpected response from server");
      await saveSession(data.token, data.refreshToken, data.user);
      return data;
    } catch (e) { throw handleAuthError(e as ApiError); }
  },

  upgradeAccountToBusiness: async (
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
  ): Promise<AuthResponse> => {
    try {
      const { data } = await api.patch<AuthResponse>("/business/upgrade-account", {
        businessName, businessCategory, phone,
        ...venueData,
      });
      if (!data.token || !data.user) throw new Error("Unexpected response from server");
      await saveSession(data.token, data.refreshToken, data.user);
      return data;
    } catch (e) { throw handleAuthError(e as ApiError); }
  },

  loginBusiness: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const { data } = await api.post<AuthResponse>("/business/login", { email, password });
      if (!data.token || !data.user) throw new Error("Unexpected response from server");
      await saveSession(data.token, data.refreshToken, data.user);
      return data;
    } catch (e) { throw handleAuthError(e as ApiError); }
  },

  getBusinessProfile: async (): Promise<AuthUser> => {
    try {
      const { data } = await api.get<AuthUser>("/business/me");
      await secureStorage.saveUserData(data);
      return data;
    } catch (e) { throw handleAuthError(e as ApiError); }
  },

  changeBusinessPassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      await api.post("/business/change-password", { currentPassword, newPassword });
    } catch (e) { throw handleAuthError(e as ApiError); }
  },

  //  Token refresh 

  refreshTokens: async (): Promise<TokenRefreshResponse> => {
    const refreshToken = await secureStorage.getRefreshToken();
    if (!refreshToken) throw new Error("No refresh token available");

    // Determine role from stored user to hit the right endpoint
    const stored = await secureStorage.getUserData<AuthUser>();
    const role = stored?.role ?? "customer";
    const endpoint = role === "business" ? "/business/refresh" : "/customer/refresh";

    try {
      const { data } = await api.post<TokenRefreshResponse>(endpoint, { refreshToken });
      await secureStorage.saveToken(data.token);
      await secureStorage.saveRefreshToken(data.refreshToken);
      return data;
    } catch (e) { throw handleAuthError(e as ApiError); }
  },

  //  Shared 

  logout: async (): Promise<void> => {
    await secureStorage.clearAuthData();
  },

  isAuthenticated: async (): Promise<boolean> => {
    return secureStorage.isAuthenticated();
  },

  getStoredUser: async (): Promise<AuthUser | null> => {
    return secureStorage.getUserData<AuthUser>();
  },
};

//  Error handling 

function handleAuthError(error: ApiError): Error {
  if (error.response) {
    const { status, data } = error.response;
    switch (status) {
      case 400: return new Error(data?.error ?? "Invalid input");
      case 401: return new Error(data?.error ?? "Invalid email or password");
      case 403: return new Error(data?.error ?? "Access denied");
      case 409: return new Error("Email already exists");
      case 500: return new Error("Server error. Please try again later.");
      default:  return new Error(data?.error ?? "Authentication failed");
    }
  } else if (error.request) {
    return new Error("Network error. Please check your connection.");
  }
  return new Error((error as any).message ?? "An unexpected error occurred");
}

export const handleApiError = (error: ApiError): string => handleAuthError(error).message;
