import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

/** Thrown when the user dismisses the Google sign-in picker without choosing an account. */
export class GoogleSignInCancelledError extends Error {
  constructor() {
    super('Sign in was cancelled');
    this.name = 'GoogleSignInCancelledError';
  }
}

/** Thrown when Google Sign-In fails due to missing keychain (e.g. iOS Simulator / Appetize). */
export class GoogleSignInSimulatorError extends Error {
  constructor() {
    super('Google Sign In is not available on the iOS Simulator. Please test on a real device or use email sign in.');
    this.name = 'GoogleSignInSimulatorError';
  }
}

/**
 * Configure the native Google Sign-In SDK.
 * Call once at app startup (e.g. in _layout.tsx or auth-context).
 */
export function configureGoogleSignIn(): void {
  const iosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ??
    '938930558037-4fgl84q262kk9a130vhssc16sh5emi4l.apps.googleusercontent.com';
  const webClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
    '938930558037-1ed436pos2lsn5onlhu1nnrr76eiu8ve.apps.googleusercontent.com';
  GoogleSignin.configure({
    iosClientId,
    webClientId,
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
    // Keychain is unavailable on iOS Simulator / Appetize
    const msg: string = error?.message ?? '';
    if (
      msg.toLowerCase().includes('keychain') ||
      msg.includes('SecItemCopyMatching') ||
      msg.includes('OSStatus') ||
      msg.includes('-34018') ||
      msg.includes('Could not decrypt')
    ) {
      throw new GoogleSignInSimulatorError();
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
