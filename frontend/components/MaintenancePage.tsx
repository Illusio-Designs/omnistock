'use client';

import { Wrench } from 'lucide-react';

interface Props {
  message: string;
  eta: string;
}

export function MaintenancePage({ message, eta }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-emerald-100/50 blur-[120px] animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-teal-100/50 blur-[120px] animate-pulse-soft" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="max-w-lg mx-auto px-6 text-center">
        {/* Animated icon */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 animate-pulse-soft" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Wrench size={40} className="text-white animate-wiggle" />
          </div>
          {/* Spinning ring */}
          <div className="absolute -inset-3 rounded-[1.75rem] border-2 border-dashed border-emerald-300/60 animate-spin-slow" />
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
          Under Maintenance
        </h1>

        <p className="mt-4 text-base text-slate-600 leading-relaxed">
          {message}
        </p>

        {eta && (
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-semibold text-emerald-700">
              Estimated time: {eta}
            </span>
          </div>
        )}

        {/* Progress bar animation */}
        <div className="mt-8 w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden mx-auto">
          <div className="h-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400 rounded-full animate-loading-bar" />
        </div>

        <p className="mt-8 text-xs text-slate-400">
          Public pages are still accessible. This only affects the dashboard.
        </p>

        <a
          href="/"
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-full hover:bg-slate-50 transition-all"
        >
          Visit Homepage
        </a>
      </div>
    </div>
  );
}
