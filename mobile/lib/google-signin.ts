/**
 * Google sign-in via expo-auth-session.
 *
 * Returns a hook the login screen consumes to fire Google OAuth and
 * receive an `id_token`, which gets POSTed to /auth/google so the
 * backend can verify it against Google's public keys and issue our
 * own JWT.
 *
 * ────────────────────────────────────────────────────────────────────
 *  ONE-TIME SETUP (per-environment) — required before this works
 * ────────────────────────────────────────────────────────────────────
 *
 *  1. Google Cloud Console → APIs & Services → Credentials
 *     Create THREE OAuth 2.0 client IDs:
 *
 *       a) iOS
 *          • Application type: iOS
 *          • Bundle ID:        com.kartriq.app
 *
 *       b) Android
 *          • Application type: Android
 *          • Package name:     com.kartriq.app
 *          • SHA-1 fingerprint: pull from your release & debug keystores:
 *              keytool -list -v -keystore <path> -alias <alias>
 *            (For EAS builds, run `eas credentials` to fetch the cert.)
 *
 *       c) Web
 *          • Application type: Web application
 *          • Authorized redirect URIs: leave empty for the auth-session flow
 *          • This client id is what the backend's GOOGLE_CLIENT_ID env
 *            var should match — backend verifies the id_token's audience
 *            against it via google-auth-library.
 *
 *  2. Paste the three client IDs into mobile/app.json → expo.extra:
 *       googleIosClientId
 *       googleAndroidClientId
 *       googleWebClientId
 *     (Or set them via EAS secrets and read through expo-constants.)
 *
 *  3. Run `npx expo install expo-auth-session expo-crypto` once. The
 *     deps are pinned in package.json; the install step makes sure the
 *     native modules are linked into the dev/build clients.
 *
 *  4. Confirm backend GOOGLE_CLIENT_ID === your Web client id (1c).
 *
 *  After all four are done, the "Continue with Google" button on the
 *  login screen will work end-to-end.
 */

import { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

// Required so the OAuth redirect can complete the in-app browser session
// when the provider bounces back to us.
WebBrowser.maybeCompleteAuthSession();

interface GoogleExtras {
  googleIosClientId?: string;
  googleAndroidClientId?: string;
  googleWebClientId?: string;
}

function readExtras(): GoogleExtras {
  return (Constants.expoConfig?.extra ?? {}) as GoogleExtras;
}

export function isGoogleConfigured(): boolean {
  const e = readExtras();
  const isPlaceholder = (v?: string) => !v || v.startsWith('TODO_');
  // Need at least the platform-appropriate ID to be set. We can't easily
  // detect platform here without importing react-native, so we treat the
  // pair (web + at least one of ios/android) as the bar.
  if (isPlaceholder(e.googleWebClientId)) return false;
  if (isPlaceholder(e.googleIosClientId) && isPlaceholder(e.googleAndroidClientId)) return false;
  return true;
}

/**
 * Hook that owns the auth-session request. Returns `promptAsync` to
 * trigger the OAuth flow, plus the resulting `idToken` once the user
 * completes it.
 *
 * Note on the dummy fallback: expo-auth-session's Google provider
 * throws an `invariantClientId` error if the platform-appropriate ID
 * is undefined — which crashes the login screen during placeholder
 * builds. We pass a syntactically-valid dummy clientId so the hook
 * initialises, then the UI guards `promptAsync()` behind the
 * `configured` flag so the user gets a clear "not configured" alert
 * instead of an opaque OAuth error.
 */
const DUMMY_CLIENT_ID = '0.apps.googleusercontent.com';

export function useGoogleSignIn() {
  const [idToken, setIdToken] = useState<string | null>(null);
  const extras = readExtras();

  const ios = placeholderToUndefined(extras.googleIosClientId);
  const android = placeholderToUndefined(extras.googleAndroidClientId);
  const web = placeholderToUndefined(extras.googleWebClientId);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId:     ios     ?? DUMMY_CLIENT_ID,
    androidClientId: android ?? DUMMY_CLIENT_ID,
    webClientId:     web     ?? DUMMY_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      // expo-auth-session returns the id_token in `params` for the
      // implicit-flow (default) variant. Newer versions surface it via
      // `authentication.idToken` — check both for resilience.
      const token =
        (response.params as Record<string, string>)?.id_token ||
        // @ts-ignore — authentication is populated when access flow is used
        response.authentication?.idToken ||
        null;
      if (token) setIdToken(token);
    }
  }, [response]);

  return {
    request,
    response,
    promptAsync,
    idToken,
    clear: () => setIdToken(null),
    configured: isGoogleConfigured(),
  };
}

function placeholderToUndefined(v?: string): string | undefined {
  if (!v || v.startsWith('TODO_')) return undefined;
  return v;
}
