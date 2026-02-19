/**
 * API Configuration
 *
 * The Hono backend runs as a STANDALONE server on port 3001
 * (started with `bun backend/server.ts`).
 *
 * URL resolution order:
 *  1. EXPO_PUBLIC_API_URL env var → explicit override
 *  2. Web (browser)        → http://localhost:3001/api  (same machine)
 *  3. Native (Expo Go)     → http://192.168.1.5:3001/api  (LAN IP of dev machine)
 *
 * We use Platform.OS instead of window detection because React Native
 * polyfills `window`, making typeof window checks unreliable on native.
 */
import { Platform } from 'react-native';

const getApiUrl = (): string => {
  // 1. Explicit env override
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Web browser — backend is on the same machine
  if (Platform.OS === 'web') {
    return 'http://localhost:3001/api';
  }

  // 3. Native device (Expo Go on phone/tablet) — must use LAN IP
  return 'http://192.168.1.5:3001/api';
};

const apiConfig = {
  apiUrl: getApiUrl(),
  timeout: 15000,
};

console.log('[API] Base URL:', apiConfig.apiUrl);

export default apiConfig;
