// Full-screen "unlock to continue" gate.
//
// Rendered by RootLayout when biometric lock is needed (see
// lib/biometric.ts → evaluateLockOnBoot). The user has three options:
//   - Tap the big button → triggers the system biometric prompt
//   - Tap "Sign in with password" → drops the stored token and routes
//     to /login so they can re-auth from scratch
//   - Lock auto-prompts once on mount so the typical happy path is "open
//     app → Face ID succeeds → app appears", no extra tap.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fingerprint, ScanFace, Lock } from 'lucide-react-native';
import { router } from 'expo-router';
import {
  authenticate, biometricLabel, getBiometricKind, setLockNeeded, BiometricKind,
} from '../lib/biometric';
import { useAuthStore } from '../store/auth.store';

interface Props {
  onUnlocked: () => void;
}

export function BiometricLock({ onUnlocked }: Props) {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const [kind, setKind] = useState<BiometricKind>('biometric');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setKind(await getBiometricKind());
      // Auto-prompt on mount so users don't have to tap twice.
      await unlock();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unlock = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await authenticate(`Unlock Kartriq`);
      setTried(true);
      if (ok) {
        setLockNeeded(false);
        onUnlocked();
      } else {
        setError('Authentication cancelled or failed.');
      }
    } finally {
      setBusy(false);
    }
  };

  const usePassword = async () => {
    setLockNeeded(false);
    await logout();
    router.replace('/login');
  };

  const label = biometricLabel(kind);
  const Icon = kind === 'face' ? ScanFace : kind === 'fingerprint' ? Fingerprint : Lock;

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="flex-1 items-center justify-center px-8">
        <View
          className="w-24 h-24 rounded-3xl bg-emerald-600 items-center justify-center mb-8"
          style={{
            shadowColor: '#06D4B8',
            shadowOpacity: 0.5,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 8 },
            elevation: 10,
          }}
        >
          <Icon size={42} color="#ffffff" />
        </View>

        <Text className="text-3xl font-extrabold text-white tracking-tight text-center">
          Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </Text>
        <Text className="text-slate-400 text-base mt-3 font-medium text-center">
          Use {label} to unlock your workspace.
        </Text>

        {error && (
          <Text className="text-rose-300 text-sm mt-6 text-center">{error}</Text>
        )}

        <Pressable
          onPress={unlock}
          disabled={busy}
          className="mt-10 bg-emerald-600 active:bg-emerald-700 rounded-2xl py-4 px-10 flex-row items-center"
          style={{
            shadowColor: '#06D4B8',
            shadowOpacity: 0.4,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon size={18} color="#ffffff" />
              <Text className="text-white text-base font-bold ml-3">
                {tried ? `Try ${label} again` : `Unlock with ${label}`}
              </Text>
            </>
          )}
        </Pressable>

        <Pressable onPress={usePassword} className="mt-8 py-2 active:opacity-60">
          <Text className="text-slate-400 text-sm font-bold">
            Sign in with password instead
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
