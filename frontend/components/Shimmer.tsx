'use client';

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

// Re-export for easy usage across the app
export { Skeleton };

/** Themed skeleton wrapper — matches Omnistock's emerald design */
export function ShimmerTheme({ children }: { children: React.ReactNode }) {
  return (
    <SkeletonTheme baseColor="#f1f5f9" highlightColor="#e2e8f0">
      {children}
    </SkeletonTheme>
  );
}

/** Card skeleton — mimics a typical dashboard card */
export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <ShimmerTheme>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6">
            <Skeleton width={80} height={12} borderRadius={8} />
            <Skeleton width={120} height={28} borderRadius={8} className="mt-3" />
            <Skeleton count={2} height={12} borderRadius={6} className="mt-4" />
            <Skeleton height={100} borderRadius={12} className="mt-4" />
          </div>
        ))}
      </div>
    </ShimmerTheme>
  );
}

/** Table skeleton — mimics a data table */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <ShimmerTheme>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex gap-4 p-4 border-b border-slate-100">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} height={14} borderRadius={6} containerClassName="flex-1" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 p-4 border-b border-slate-50">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} height={12} borderRadius={6} containerClassName="flex-1" />
            ))}
          </div>
        ))}
      </div>
    </ShimmerTheme>
  );
}

/** Stats skeleton — mimics stat counters */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ShimmerTheme>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
            <Skeleton width={60} height={36} borderRadius={8} className="mx-auto" />
            <Skeleton width={100} height={10} borderRadius={6} className="mt-3 mx-auto" />
          </div>
        ))}
      </div>
    </ShimmerTheme>
  );
}

/** Section skeleton — full section placeholder */
export function SectionSkeleton() {
  return (
    <ShimmerTheme>
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <Skeleton width={200} height={16} borderRadius={20} className="mx-auto" />
          <Skeleton width={400} height={32} borderRadius={8} className="mt-4 mx-auto" />
          <Skeleton width={300} height={14} borderRadius={6} className="mt-3 mx-auto" />
        </div>
        <CardSkeleton count={3} />
      </div>
    </ShimmerTheme>
  );
}

/** Page skeleton — full page loading state */
export function PageSkeleton() {
  return (
    <ShimmerTheme>
      <div className="min-h-screen">
        {/* Nav skeleton */}
        <div className="h-16 border-b border-slate-100 px-6 flex items-center justify-between">
          <Skeleton width={120} height={28} borderRadius={8} />
          <div className="flex gap-4">
            <Skeleton width={60} height={14} borderRadius={6} />
            <Skeleton width={60} height={14} borderRadius={6} />
            <Skeleton width={60} height={14} borderRadius={6} />
          </div>
          <Skeleton width={100} height={36} borderRadius={20} />
        </div>
        {/* Hero skeleton */}
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <Skeleton width={200} height={28} borderRadius={20} className="mx-auto" />
          <Skeleton width={500} height={48} borderRadius={8} className="mt-6 mx-auto" />
          <Skeleton width={400} height={16} borderRadius={6} className="mt-4 mx-auto" />
          <div className="flex gap-3 justify-center mt-8">
            <Skeleton width={140} height={44} borderRadius={24} />
            <Skeleton width={160} height={44} borderRadius={24} />
          </div>
        </div>
        {/* Content skeleton */}
        <div className="max-w-6xl mx-auto px-6 py-10">
          <CardSkeleton count={3} />
        </div>
      </div>
    </ShimmerTheme>
  );
}
