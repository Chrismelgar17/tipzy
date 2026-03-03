/**
 * Native Google Sign-In helper.
 *
 * ⚠️  STUB — awaiting native build
 * The @react-native-google-signin/google-signin package requires a native binary
 * that includes the RNGoogleSignin module.  Loading it via require() in a
 * production OTA bundle causes a hard crash on any binary that was built without
 * the native module (TurboModuleRegistry.getEnforcing throws at module-eval time,
 * BEFORE our try/catch can execute, because Metro evaluates all module factories
 * eagerly in production bundles).
 *
 * Until a new APK/IPA is built with `@react-native-google-signin/google-signin`
 * properly linked, these functions are safe stubs that produce user-friendly errors.
 * Re-enable the real implementation once the native build is shipped.
 */

/** Thrown when the user dismisses the Google sign-in picker without choosing an account. */
export class GoogleSignInCancelledError extends Error {
  constructor() {
    super('Sign in was cancelled');
    this.name = 'GoogleSignInCancelledError';
  }
}

/**
 * Configure the native Google Sign-In SDK.
 * No-op stub — safe to call at any time without crashing.
 */
export function configureGoogleSignIn(): void {
  // No-op until a native build with @react-native-google-signin/google-signin is available.
}

/**
 * Opens the native Google account picker and returns an accessToken.
 * Currently a stub — throws until a native build is available.
 */
export async function nativeGoogleSignIn(): Promise<{ accessToken: string }> {
  throw new Error(
    'Google Sign-In is not available in this version of the app. Please sign in with your email and password, or update the app when a new version is released.',
  );
}

/**
 * Sign out of the native Google SDK.
 * No-op stub — safe to call without crashing.
 */
export async function nativeGoogleSignOut(): Promise<void> {
  // No-op until a native build with @react-native-google-signin/google-signin is available.
}
