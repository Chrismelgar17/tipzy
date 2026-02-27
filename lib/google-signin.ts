/**
 * Native Google Sign-In helper for Android & iOS production builds.
 *
 * Uses @react-native-google-signin/google-signin which calls the native
 * Google Sign-In SDK — no browser redirect, no deep-link callback,
 * no Activity restart on Android.
 *
 * Flow:
 *  1. configureGoogleSignIn() — call once at app startup (app/_layout.tsx)
 *  2. nativeGoogleSignIn()    — call on button press, returns accessToken
 *  3. Send { provider: 'google', accessToken } → POST /api/customer/provider-auth
 *
 * The backend verifies the token by calling Google's userinfo endpoint
 * (no GOOGLE_CLIENT_IDS env var required on the server).
 */
import { Platform } from 'react-native';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

let _configured = false;

/**
 * Configure the native Google Sign-In SDK.
 * Must be called once at app startup before any sign-in attempt.
 */
export function configureGoogleSignIn(): void {
  if (Platform.OS === 'web' || !WEB_CLIENT_ID) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    if (_configured) return;
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      scopes: ['profile', 'email'],
      offlineAccess: false,
    });
    _configured = true;
  } catch {
    // Package not yet linked — will happen the first time before a native rebuild.
  }
}

/** Thrown when the user dismisses the Google sign-in picker without choosing an account. */
export class GoogleSignInCancelledError extends Error {
  constructor() {
    super('Sign in was cancelled');
    this.name = 'GoogleSignInCancelledError';
  }
}

/**
 * Opens the native Google account picker and returns a Google accessToken.
 * The token can be sent directly to the backend /api/customer/provider-auth.
 *
 * @throws {GoogleSignInCancelledError} if the user dismissed the picker
 * @throws {Error} with a human-readable message for all other failures
 */
export async function nativeGoogleSignIn(): Promise<{ accessToken: string }> {
  if (Platform.OS === 'web') {
    throw new Error('Native Google Sign-In is not available on web. Please sign in with email.');
  }
  if (!WEB_CLIENT_ID) {
    throw new Error(
      'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not configured. Add it to your .env file.',
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {
    GoogleSignin,
    statusCodes,
    isErrorWithCode,
    isCancelledResponse,
    isSuccessResponse,
  } = require('@react-native-google-signin/google-signin');

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const response = await GoogleSignin.signIn();

    if (isCancelledResponse(response)) {
      throw new GoogleSignInCancelledError();
    }

    if (!isSuccessResponse(response)) {
      throw new Error('Google Sign-In did not complete successfully.');
    }

    // Get the OAuth tokens — accessToken is what our backend expects.
    const tokens = await GoogleSignin.getTokens();

    if (!tokens.accessToken) {
      throw new Error('Google Sign-In completed but did not return an access token.');
    }

    return { accessToken: tokens.accessToken };
  } catch (error: any) {
    // Re-throw our own errors as-is
    if (error instanceof GoogleSignInCancelledError) throw error;

    // Map native SDK error codes to user-friendly messages
    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          throw new GoogleSignInCancelledError();
        case statusCodes.IN_PROGRESS:
          throw new Error('A sign-in is already in progress. Please wait.');
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new Error(
            'Google Play Services is not available or needs an update. Please update it and try again.',
          );
        default:
          throw new Error(`Google Sign-In error: ${error.message}`);
      }
    }
    throw error;
  }
}

/**
 * Revoke access and sign the user out of the native Google SDK.
 * Call this alongside your app's sign-out flow.
 */
export async function nativeGoogleSignOut(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
  } catch {
    // Ignore — user may not have been signed in via native Google.
  }
}
