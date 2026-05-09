/**
 * Tiny analytics dispatcher.
 *
 * Fires a custom event into every loaded analytics tool at once
 * (Clarity + Google Analytics today; Facebook Pixel can be added later
 * by extending one switch statement). Each call is a NO-OP when the
 * underlying tool isn't loaded — either because the visitor declined
 * cookies, the script hasn't initialised yet, or no ID is configured
 * for that tool — so callers don't need to guard.
 *
 * Use it like:
 *   import { track, tag } from '@/lib/analytics';
 *   track('demo_request_submit', { source: 'pricing' });
 *   tag('user_type', 'tenant');     // pins this on the Clarity session
 *
 * Microsoft Clarity API:
 *   window.clarity('event', name)             — fires a custom event
 *   window.clarity('set', key, value)         — adds a session-level tag
 *   window.clarity('upgrade', 'reason')       — flag a session as
 *     important so Clarity preserves the recording in its quota
 *
 * Google Analytics 4 API:
 *   window.gtag('event', name, params)
 */

type ClarityCommand =
  | ['event', string]
  | ['set', string, string]
  | ['upgrade', string]
  | ['identify', string, string?, string?, string?];

declare global {
  interface Window {
    clarity?: (...args: any[]) => void;
    gtag?: (...args: any[]) => void;
  }
}

function safeClarity(...args: any[]) {
  try {
    if (typeof window !== 'undefined' && typeof window.clarity === 'function') {
      window.clarity(...args);
    }
  } catch { /* swallow — analytics never breaks the call site */ }
}

function safeGtag(...args: any[]) {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag(...args);
    }
  } catch { /* swallow */ }
}

/**
 * Fire a custom event into every loaded analytics tool.
 *
 * @param name  — short snake_case identifier (e.g. "demo_request_submit").
 *                Will appear as a filterable event name in Clarity dashboards
 *                and as the GA4 event name.
 * @param params — flat key/value object. GA4 records each as an event
 *                 parameter; Clarity's `event` API doesn't take params, so
 *                 we additionally `set` each pair as a session tag for
 *                 filtering recordings.
 */
export function track(name: string, params?: Record<string, string | number | boolean>) {
  safeClarity('event', name);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      safeClarity('set', k, String(v));
    }
  }
  safeGtag('event', name, params || {});
}

/**
 * Pin a session-level tag (Clarity) / user property (GA4). Useful for
 * segmenting recordings — e.g. tag every authenticated session with
 * the user's role so you can filter Clarity recordings by "STAFF".
 */
export function tag(key: string, value: string | number | boolean) {
  safeClarity('set', key, String(value));
  safeGtag('set', 'user_properties', { [key]: String(value) });
}

/**
 * Mark the current Clarity recording as worth preserving. Free-tier
 * Clarity is sample-based, so flagging high-value sessions (paying
 * tenant signup, checkout flow, support escalation) makes sure the
 * recording isn't dropped.
 */
export function upgradeSession(reason: string) {
  safeClarity('upgrade', reason);
}
