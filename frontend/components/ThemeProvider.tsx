'use client';

/**
 * Mounts once at the top of the app. Hydrates the theme preference from
 * localStorage and listens for OS-level dark-mode changes so "system"
 * follows along live (no manual refresh needed).
 *
 * The actual class-toggling lives in store/theme.store.ts → applyTheme().
 */

import { useEffect } from 'react';
import { hydrateTheme, useThemeStore, applyTheme } from '@/store/theme.store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    hydrateTheme();
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = () => {
      // Only react when the user is on "system" — explicit light/dark wins.
      const pref = useThemeStore.getState().pref;
      if (pref === 'system') applyTheme('system');
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  return <>{children}</>;
}
