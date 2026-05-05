'use client';

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface MultiSelectProps {
  value: string[];
  onChange: (values: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  label?: ReactNode;
  className?: string;
  fullWidth?: boolean;
  size?: 'sm' | 'md';
  /** When 2+ selected: 'count' shows "N selected", 'chips' shows labels comma-separated. */
  summary?: 'count' | 'chips';
  /** Optional max-height for the dropdown panel. */
  maxHeight?: number;
}

const SIZE_CLASSES = {
  sm: 'px-2.5 py-1 text-xs rounded-lg min-h-[28px]',
  md: 'px-4 py-2.5 text-sm rounded-xl min-h-[42px]',
};

/**
 * Dropdown that lets the user pick multiple values. Visually matches
 * <Select>, with an inline count badge or comma-separated label list.
 *
 *   <MultiSelect
 *     value={statuses}
 *     onChange={setStatuses}
 *     options={[
 *       { value: 'OPEN', label: 'Open' },
 *       { value: 'PENDING', label: 'Pending' },
 *     ]}
 *     placeholder="All statuses"
 *     fullWidth
 *   />
 *
 * Use inside <FilterBar> for filter rows that need OR-style multi-pick.
 * For free-floating chips that don't need to be opened/closed, use
 * <FilterChips multiple>.
 */
export function MultiSelect({
  value, onChange, options, placeholder = 'Select…', label,
  className, fullWidth, size = 'md', summary = 'count', maxHeight = 256,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const selected = useMemo(
    () => options.filter((o) => value.includes(o.value)),
    [options, value]
  );

  const toggle = (v: string) => {
    const next = new Set(value);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(Array.from(next));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const summaryNode = (() => {
    if (selected.length === 0) return <span className="text-slate-400 truncate">{placeholder}</span>;
    if (selected.length === 1) return <span className="truncate text-slate-900">{selected[0].label}</span>;
    if (summary === 'chips') {
      return <span className="truncate text-slate-900">{selected.map((s) => s.label).join(', ')}</span>;
    }
    return (
      <span className="flex items-center gap-1.5 truncate">
        <span className="truncate text-slate-900">{selected[0].label}</span>
        <span className={cn(
          'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-emerald-100 text-emerald-700 font-bold',
          size === 'sm' ? 'text-[9px]' : 'text-[10px]'
        )}>
          +{selected.length - 1}
        </span>
      </span>
    );
  })();

  return (
    <div ref={ref} className={cn('relative', fullWidth && 'w-full', className)}>
      {label && (
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center justify-between gap-2 bg-white border border-slate-200 hover:border-slate-300 transition-all w-full',
          'focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400',
          SIZE_CLASSES[size]
        )}
      >
        <span className="flex-1 text-left flex items-center min-w-0">{summaryNode}</span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {selected.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear selection"
              onClick={clearAll}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange([]);
                }
              }}
              className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X size={size === 'sm' ? 11 : 13} />
            </span>
          )}
          <ChevronDown size={size === 'sm' ? 12 : 15} className={cn('text-slate-400 transition-transform', open && 'rotate-180')} />
        </span>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-900/10 p-1 z-50 overflow-y-auto animate-slide-up"
          style={{ maxHeight }}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400 text-center">No options</div>
          ) : options.map((opt) => {
            const isSelected = value.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                  isSelected
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                )}
              >
                <span className="flex items-center gap-2 truncate">
                  {opt.icon}
                  {opt.label}
                </span>
                <span className={cn(
                  'flex items-center justify-center w-5 h-5 rounded border flex-shrink-0',
                  isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'
                )}>
                  {isSelected && <Check size={12} className="text-white" />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
