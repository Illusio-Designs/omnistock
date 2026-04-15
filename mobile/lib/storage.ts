import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// expo-secure-store is not available on web; fall back to localStorage there.
const isWeb = Platform.OS === 'web';

export const tokenStorage = {
  async get(key: string): Promise<string | null> {
    if (isWeb) return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (isWeb) {
      if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (isWeb) {
      if (typeof window !== 'undefined') window.localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

// Synchronous in-memory mirror so axios interceptors (which are sync) can
// attach the auth header without awaiting SecureStore on every request.
let cachedToken: string | null = null;
let cachedImpersonation: string | null = null;

export const tokenCache = {
  get: () => cachedToken,
  set: (v: string | null) => {
    cachedToken = v;
  },
  getImpersonation: () => cachedImpersonation,
  setImpersonation: (v: string | null) => {
    cachedImpersonation = v;
  },
};

export async function hydrateTokenCache() {
  cachedToken = await tokenStorage.get('token');
  cachedImpersonation = await tokenStorage.get('impersonate-tenant');
}
