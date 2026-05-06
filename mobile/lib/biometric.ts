// Biometric authentication helper.
//
// Wraps expo-local-authentication so the rest of the app doesn't have to
// care about platform/hardware/enrollment details. Two pieces of state
// live here:
//
//   - "biometric.enabled"   — the user opted in. Persisted via SecureStore.
//   - lockNeeded (in-mem)   — runtime flag flipped on app cold-start. The
//                              root layout reads this to decide whether to
//                              render the BiometricLock gate before the
//                              actual app shell.
//
// Why an in-memory flag for lockNeeded instead of persisting it: we want
// the lock to appear on every cold start, never on hot navigation between
// screens. Persisting would either lock too aggressively (every navigation)
// or never (after the first unlock).

import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { tokenStorage } from './storage';

const ENABLED_KEY = 'biometric.enabled';

let lockNeeded = false;

export type BiometricKind = 'face' | 'fingerprint' | 'iris' | 'biometric' | 'none';

/** Hardware present AND user has enrolled at least one biometric. */
export async function isAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const [hw, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return !!hw && !!enrolled;
  } catch {
    return false;
  }
}

/** Best-guess label for what the device offers, for UI copy. */
export async function getBiometricKind(): Promise<BiometricKind> {
  if (Platform.OS === 'web') return 'none';
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'iris';
    if (types.length > 0) return 'biometric';
    return 'none';
  } catch {
    return 'none';
  }
}

export function biometricLabel(kind: BiometricKind): string {
  if (kind === 'face') return Platform.OS === 'ios' ? 'Face ID' : 'Face Unlock';
  if (kind === 'fingerprint') return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
  if (kind === 'iris') return 'Iris';
  if (kind === 'biometric') return 'Biometrics';
  return 'Device passcode';
}

/**
 * Trigger the system biometric prompt. Returns `true` on success.
 * `disableDeviceFallback: false` so users without enrolled biometrics can
 * still unlock with the device PIN — important on Android where
 * fingerprint sensors fail often in winter.
 */
export async function authenticate(reason: string = 'Unlock Kartriq'): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Use password',
      fallbackLabel: 'Use device passcode',
      disableDeviceFallback: false,
    });
    return r.success === true;
  } catch {
    return false;
  }
}

// ── Preference + lock-state helpers ────────────────────────────────────────

export async function isEnabled(): Promise<boolean> {
  const v = await tokenStorage.get(ENABLED_KEY);
  return v === 'true';
}

export async function setEnabled(value: boolean): Promise<void> {
  if (value) await tokenStorage.set(ENABLED_KEY, 'true');
  else await tokenStorage.remove(ENABLED_KEY);
}

/** True if the app should render the BiometricLock screen right now. */
export function getLockNeeded(): boolean {
  return lockNeeded;
}

export function setLockNeeded(v: boolean): void {
  lockNeeded = v;
}

/**
 * Called once at boot from RootLayout. Locks the app if:
 *   - the user previously enabled biometrics, AND
 *   - we have a stored auth token (otherwise they go to /login anyway).
 */
export async function evaluateLockOnBoot(): Promise<void> {
  try {
    const [enabled, token] = await Promise.all([
      isEnabled(),
      tokenStorage.get('token'),
    ]);
    setLockNeeded(!!enabled && !!token);
  } catch {
    setLockNeeded(false);
  }
}
