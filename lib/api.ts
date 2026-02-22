import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiConfig from './api.config';

/**
 * Axios instance pre-configured with base URL and timeout.
 * Interceptors automatically attach the JWT Bearer token to every
 * outgoing request and handle 401/403 responses globally.
 */
const api = axios.create({
  baseURL: apiConfig.apiUrl,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor ─────────────────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('[API] Error reading auth token:', error);
    }
    console.log(`[API] → ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    // Update baseURL dynamically in case env changed
    config.baseURL = apiConfig.apiUrl;
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor ────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    console.log(
      `[API] ← ${response.status} ${response.config.url}`,
      typeof response.data === 'object' ? response.data : '[non-JSON response — check API URL]',
    );
    return response;
  },
  async (error) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (error.response) {
      const { status, data } = error.response;
      console.error(`[API] ← ${status} ${originalRequest?.url}`, data);

      // Token expired – try a silent refresh then retry once
      if (status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const { authService } = await import('./auth.service');
          const { token } = await authService.refreshTokens();
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        } catch {
          console.warn('[Auth] Refresh failed – clearing session');
          await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userData']);
        }
      }

      if (status === 403) {
        console.error('[Auth] Access denied – insufficient permissions.');
      }
    } else if (error.request) {
      console.error('[API] Network error – no response. Check the backend is running and the URL is reachable.');
    } else {
      console.error('[API] Error:', error.message);
    }

    return Promise.reject(error);
  },
);

export default api;
