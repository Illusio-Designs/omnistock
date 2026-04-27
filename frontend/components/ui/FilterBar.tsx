'use client';

import { ReactNode } from 'react';
import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface FilterBarProps {
  /** Filter controls (Select, DatePicker, Input, etc.). */
  children: ReactNode;
  /** Count of currently-applied filters; surfaces a small badge. */
  activeCount?: number;
  /** Called when the user clicks "Clear all". Hidden if not provided. */
  onClear?: () => void;
  /** Hide the leading Filter icon + label (use when the bar is self-evident). */
  hideLabel?: boolean;
  className?: string;
}

/**
 * Wrapper for a row of filter controls. Standardizes spacing, surfaces an
 * active-filter count, and exposes a Clear button.
 *
 *   <FilterBar
 *     activeCount={[status, risk].filter(Boolean).length}
 *     onClear={() => { setStatus(''); setRisk(''); }}
 *   >
 *     <Select value={status} onChange={setStatus} options={...} />
 *     <Select value={risk} onChange={setRisk} options={...} />
 *   </FilterBar>
 */
export function FilterBar({ children, activeCount = 0, onClear, hideLabel, className }: FilterBarProps) {
  return (
    <div className={cn(
      'flex flex-wrap items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl',
      className
    )}>
      {!hideLabel && (
        <div className="flex items-center gap-2 pr-3 border-r border-slate-100">
          <Filter size={14} className="text-slate-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Filters</span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 flex-1">
        {children}
      </div>

      {onClear && activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<X size={12} />}
          onClick={onClear}
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
