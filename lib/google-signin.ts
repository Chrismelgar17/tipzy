import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

/** Thrown when the user dismisses the Google sign-in picker without choosing an account. */
export class GoogleSignInCancelledError extends Error {
  constructor() {
    super('Sign in was cancelled');
    this.name = 'GoogleSignInCancelledError';
  }
}

/**
 * Configure the native Google Sign-In SDK.
 * Call once at app startup (e.g. in _layout.tsx or auth-context).
 */
export function configureGoogleSignIn(): void {
  GoogleSignin.configure({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: ['email', 'profile'],
  });
}

/**
 * Opens the native Google account picker and returns an accessToken.
 */
export async function nativeGoogleSignIn(): Promise<{ accessToken: string }> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    await GoogleSignin.signIn();
    const tokens = await GoogleSignin.getTokens();
    if (!tokens.accessToken) {
      throw new Error('Google Sign-In did not return an access token.');
    }
    return { accessToken: tokens.accessToken };
  } catch (error: any) {
    if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new GoogleSignInCancelledError();
    }
    throw error;
  }
}

/**
 * Sign out of the native Google SDK.
 */
export async function nativeGoogleSignOut(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Ignore sign-out errors
  }
}
