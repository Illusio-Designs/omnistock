'use client';

// Last-resort error boundary. Renders ONLY when the root layout itself throws.
// Must define <html> and <body> because the layout didn't get a chance to.
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif', margin: 0, padding: 0, background: '#f8fafc' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
              The application encountered an unexpected error. Our team has been notified.
            </p>
            {error.digest && (
              <p style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace', marginBottom: 24 }}>
                Error ID: {error.digest}
              </p>
            )}
            <a
              href="/"
              style={{
                display: 'inline-block', padding: '10px 24px', background: '#06D4B8',
                color: 'white', borderRadius: 9999, textDecoration: 'none', fontWeight: 600, fontSize: 14,
              }}
            >
              Reload
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
