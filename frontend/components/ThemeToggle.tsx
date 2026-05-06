'use client';

/**
 * Three-state theme toggle for the topbar. Cycles light → dark → system.
 * Tooltip wrapper is up to the caller (Topbar wraps it for label hint).
 */

import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore } from '@/store/theme.store';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { pref, cycleTheme } = useThemeStore();
  const Icon = pref === 'light' ? Sun : pref === 'dark' ? Moon : Monitor;
  const label =
    pref === 'light' ? 'Light · click for Dark' :
    pref === 'dark'  ? 'Dark · click for System' :
                       'System · click for Light';
  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`Theme: ${label}`}
      className={`w-10 h-10 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/10 text-white/60 hover:text-white transition-colors ${className}`}
    >
      <Icon size={16} />
    </button>
  );
}
