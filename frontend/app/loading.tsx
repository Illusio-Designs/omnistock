// Top-level loading shell shown while the active segment streams in. Kept
// minimal — segment-level loading.tsx files render richer skeletons.
export default function RootLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="min-h-screen flex items-center justify-center bg-slate-50"
    >
      <div className="flex items-center gap-3 text-slate-500">
        <svg
          className="animate-spin"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" stroke="#cbd5e1" strokeWidth="3" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="#06D4B8" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}
