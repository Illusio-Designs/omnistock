'use client';

/**
 * Cookie consent banner — gates non-essential trackers (GA / FB Pixel /
 * Microsoft Clarity) behind explicit user consent. Required by India's
 * DPDP Act and EU GDPR.
 *
 * Consent state lives in localStorage under `cookie-consent`:
 *   - missing  → banner is shown, no trackers loaded
 *   - "all"    → trackers loaded
 *   - "essential" → no trackers loaded, banner hidden
 *
 * Other components read the same key via `getConsent()` to decide whether
 * to mount tracker scripts. The custom `cookie-consent-change` event is
 * dispatched when the user makes a choice, so listeners can react without
 * polling.
 */

import { useEffect, useState } from 'react';
import { Cookie, X } from 'lucide-react';
import Link from 'next/link';

const STORAGE_KEY = 'cookie-consent';
const CHANGE_EVENT = 'cookie-consent-change';

export type ConsentValue = 'all' | 'essential';

export function getConsent(): ConsentValue | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'all' || v === 'essential' ? v : null;
}

export function setConsent(value: ConsentValue) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, value);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: value }));
}

/** Subscribe to consent changes. Returns an unsubscribe function. */
export function onConsentChange(cb: (v: ConsentValue) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => cb((e as CustomEvent<ConsentValue>).detail);
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

/**
 * Wipe the stored consent so the banner re-appears. Use this from a
 * "Manage cookies" footer link or a dev-tools shortcut. Also fires
 * cookie-consent-change with null so any loaded trackers can react
 * (today they don't actively unload — a refresh is needed for a clean
 * state — but the event is here for future use).
 */
export function resetConsent() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: null as any }));
  window.dispatchEvent(new Event('cookie-consent-reset'));
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Defer to next tick so SSR markup matches client-render before showing.
    const t = setTimeout(() => {
      if (!getConsent()) setVisible(true);
    }, 600);
    // Listen for "Manage cookies" clicks elsewhere on the page so we can
    // re-open the banner without a full reload.
    const onReset = () => setVisible(true);
    window.addEventListener('cookie-consent-reset', onReset);
    return () => {
      clearTimeout(t);
      window.removeEventListener('cookie-consent-reset', onReset);
    };
  }, []);

  if (!visible) return null;

  const choose = (v: ConsentValue) => {
    setConsent(v);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-[9999] animate-slide-up"
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-900/15 p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Cookie size={20} className="text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 text-sm">We value your privacy</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              We use essential cookies to keep the site working, and analytics
              cookies (Google Analytics, Facebook Pixel, Microsoft Clarity) to
              understand how it&apos;s used. You can accept all or stick with
              essential only — your choice is remembered on this device.
            </p>
            <div className="text-[11px] text-slate-500 mt-2">
              See our{' '}
              <Link href="/privacy" className="underline hover:text-emerald-600">
                Privacy Policy
              </Link>
              {' · '}
              <Link href="/terms" className="underline hover:text-emerald-600">
                Terms
              </Link>
              .
            </div>
          </div>
          <button
            onClick={() => choose('essential')}
            aria-label="Reject non-essential cookies"
            className="p-1 -m-1 text-slate-400 hover:text-slate-700 flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => choose('essential')}
            className="flex-1 px-4 py-2 text-xs font-bold rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Essential only
          </button>
          <button
            onClick={() => choose('all')}
            className="flex-1 px-4 py-2 text-xs font-bold rounded-full bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
