// Browser-side Sentry init. No-ops without NEXT_PUBLIC_SENTRY_DSN, so dev
// builds and local runs don't need Sentry credentials.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV || process.env.NODE_ENV,
    // Sample 10% of normal traffic, 100% of errors. Bump tracesSampleRate
    // up if we need richer perf data; it costs Sentry quota.
    tracesSampleRate: 0.1,
    // Replay sessions help debug XSS/CSP regressions and weird auth flows.
    // Conservative defaults — 10% normally, 100% on errors.
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    // Strip query strings + JWTs from breadcrumb URLs before send. Defense
    // in depth — Sentry already redacts common auth headers.
    beforeBreadcrumb(crumb) {
      if (crumb.category === 'fetch' || crumb.category === 'xhr') {
        const url = (crumb.data as Record<string, unknown> | undefined)?.url;
        if (typeof url === 'string') {
          (crumb.data as Record<string, unknown>).url = url.split('?')[0];
        }
      }
      return crumb;
    },
    ignoreErrors: [
      // Browser extensions / cross-origin scripts we can't fix.
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
    ],
  });
}
