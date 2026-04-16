'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[App Error]', error.message, error.digest);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md mx-auto px-6 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-50 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Something went wrong</h2>
        <p className="mt-2 text-sm text-slate-600">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-slate-400 font-mono">Error ID: {error.digest}</p>
        )}
        <div className="mt-6 flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-full transition-all"
          >
            Try Again
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-full hover:bg-slate-50 transition-all"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
