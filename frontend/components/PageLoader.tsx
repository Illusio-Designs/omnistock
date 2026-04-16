'use client';

import { useEffect, useState } from 'react';

export function PageLoader() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 600);
    const remove = setTimeout(() => setVisible(false), 1200);
    return () => { clearTimeout(timer); clearTimeout(remove); };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-all duration-500 ${
        fadeOut ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
      }`}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Animated logo mark */}
        <div className="relative w-16 h-16">
          {/* Outer spinning ring */}
          <div className="absolute inset-0 rounded-2xl border-2 border-emerald-200 animate-spin-slow" />
          {/* Inner pulsing square */}
          <div className="absolute inset-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 animate-pulse-soft flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {/* Orbiting dots */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-400 animate-orbit" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-teal-400 animate-orbit" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Loading bar */}
        <div className="w-32 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400 rounded-full animate-loading-bar" />
        </div>
      </div>
    </div>
  );
}
