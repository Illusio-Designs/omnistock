// Server-side (Node runtime) Sentry init. SENTRY_DSN (server-side, not the
// public one) is preferred but falls back to the public DSN.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENV || process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}
