'use client';

/**
 * Theme preference store.
 *
 * Three values:
 *   - "light"   → force light
 *   - "dark"    → force dark
 *   - "system"  → follow OS preference (default)
 *
 * Persisted to localStorage. `applyTheme()` is the single source of truth
 * for putting / removing `class="dark"` on <html>; ThemeProvider mounts it
 * once and re-runs on store changes. The toggle component just calls
 * `setTheme()`.
 */

import { create } from 'zustand';

export type ThemePref = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'kartriq.theme';

function readStored(): ThemePref {
  if (typeof window === 'undefined') return 'system';
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
}

/** Resolves a preference into the actually-applied mode at this moment. */
export function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return pref;
}

/** Toggle the .dark class on <html>. Idempotent — safe to call repeatedly. */
export function applyTheme(pref: ThemePref) {
  if (typeof document === 'undefined') return;
  const mode = resolveTheme(pref);
  const root = document.documentElement;
  if (mode === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  // Hint the browser so native UI bits (form controls, scrollbars) flip too
  root.style.colorScheme = mode;
}

interface ThemeState {
  pref: ThemePref;
  setTheme: (pref: ThemePref) => void;
  /** Cycle: light → dark → system → light */
  cycleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  pref: 'system',
  setTheme: (pref) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, pref);
    }
    applyTheme(pref);
    set({ pref });
  },
  cycleTheme: () => {
    const order: ThemePref[] = ['light', 'dark', 'system'];
    const current = get().pref;
    const next = order[(order.indexOf(current) + 1) % order.length];
    get().setTheme(next);
  },
}));

/** Hydrate from localStorage on first client-side render. */
export function hydrateTheme() {
  if (typeof window === 'undefined') return;
  const pref = readStored();
  useThemeStore.setState({ pref });
  applyTheme(pref);
}
