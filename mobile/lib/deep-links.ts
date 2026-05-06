// Deep-link handling.
//
// Sources of incoming URLs:
//   - Cold start    — app launched by tapping a link → captured via
//                      Linking.getInitialURL()
//   - Warm start    — user already had the app open → fired through
//                      Linking.addEventListener('url')
//   - Push tap      — handled separately in lib/push.ts (the server
//                      already attaches the target path to data.path,
//                      so we don't need to re-parse a URL there)
//
// Supported schemes:
//   kartriq://orders/abc123          → /orders?id=abc123
//   kartriq://orders                 → /orders
//   kartriq://accept-invite?token=…  → /accept-invite?token=…
//   https://kartriq.com/m/orders/123 → /orders?id=123  (universal link)
//   https://app.kartriq.com/orders   → /orders         (any path on the
//                                                       authed subdomain)
//
// Routes that don't exist on mobile silently fall back to /dashboard so a
// stale email link doesn't crash the app.

import * as Linking from 'expo-linking';
import { router } from 'expo-router';

// Top-level routes the mobile app actually has — used to validate that a
// parsed segment is something we can navigate to. Keep in sync with
// app/(app)/*.tsx.
const KNOWN_ROUTES = new Set([
  'dashboard', 'orders', 'products', 'inventory', 'customers', 'invoices',
  'shipments', 'vendors', 'warehouses', 'channels', 'reports', 'purchases',
  'team', 'settings', 'billing', 'admin', 'more',
  // Public / auth routes
  'login', 'register', 'onboarding', 'accept-invite',
]);

/**
 * Translate an incoming URL into the expo-router path we should push.
 * Returns null if the URL is unrecognised — caller falls back to a sensible
 * default (usually /dashboard).
 */
export function resolveTarget(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    // Path looks like "orders/abc123" or "" for bare-scheme launches
    let path = parsed.path?.trim() || '';
    if (path.startsWith('/')) path = path.slice(1);

    // Universal-link prefix on https://kartriq.com/m/* — strip the /m
    if (path.startsWith('m/')) path = path.slice(2);

    if (!path) return null;

    const [head, ...rest] = path.split('/');
    if (!KNOWN_ROUTES.has(head)) return null;

    const id = rest[0]; // e.g. "orders/abc123" → id="abc123"
    const search = parsed.queryParams || {};
    const params = new URLSearchParams();
    if (id) params.set('id', id);
    for (const [k, v] of Object.entries(search)) {
      if (Array.isArray(v)) v.forEach((vv) => params.append(k, String(vv)));
      else if (v != null) params.set(k, String(v));
    }
    const qs = params.toString();
    return qs ? `/${head}?${qs}` : `/${head}`;
  } catch {
    return null;
  }
}

/**
 * Mount the global URL listeners. Idempotent — call once from
 * RootLayout. Returns a teardown function for unmount.
 */
export function attachDeepLinkHandler(): () => void {
  // Cold start
  Linking.getInitialURL()
    .then((url) => {
      if (!url) return;
      const target = resolveTarget(url);
      if (target) router.push(target as any);
    })
    .catch(() => {});

  // Warm start
  const sub = Linking.addEventListener('url', ({ url }) => {
    const target = resolveTarget(url);
    if (target) router.push(target as any);
  });

  return () => sub.remove();
}
