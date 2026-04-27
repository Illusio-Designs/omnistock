'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FilterChipOption<V extends string = string> {
  value: V;
  label: string;
  icon?: ReactNode;
  count?: number;
  /** Override the active-state color. Default emerald. */
  activeColor?: 'emerald' | 'blue' | 'amber' | 'rose' | 'violet' | 'slate';
}

type SingleProps<V extends string> = {
  multiple?: false;
  value: V;
  onChange: (value: V) => void;
  options: FilterChipOption<V>[];
  size?: 'sm' | 'md';
  className?: string;
};

type MultiProps<V extends string> = {
  multiple: true;
  value: V[];
  onChange: (values: V[]) => void;
  options: FilterChipOption<V>[];
  size?: 'sm' | 'md';
  className?: string;
};

type FilterChipsProps<V extends string> = SingleProps<V> | MultiProps<V>;

const ACTIVE_COLORS = {
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  blue:    'bg-blue-50 border-blue-200 text-blue-700',
  amber:   'bg-amber-50 border-amber-200 text-amber-700',
  rose:    'bg-rose-50 border-rose-200 text-rose-700',
  violet:  'bg-violet-50 border-violet-200 text-violet-700',
  slate:   'bg-slate-100 border-slate-300 text-slate-800',
};

const SIZES = {
  sm: { chip: 'px-2.5 py-1 text-[11px] gap-1', count: 'text-[9px] min-w-[16px] h-4 px-1' },
  md: { chip: 'px-3 py-1.5 text-xs gap-1.5',   count: 'text-[10px] min-w-[18px] h-[18px] px-1.5' },
};

/**
 * Toggleable filter pill chips. Two flavors:
 *
 *   Single-select (radio-style):
 *     <FilterChips
 *       value={status}
 *       onChange={setStatus}
 *       options={[{ value: '', label: 'All' }, { value: 'OPEN', label: 'Open', count: 23 }]}
 *     />
 *
 *   Multi-select:
 *     <FilterChips
 *       multiple
 *       value={statuses}
 *       onChange={setStatuses}
 *       options={[{ value: 'OPEN', label: 'Open' }, { value: 'PENDING', label: 'Pending' }]}
 *     />
 *
 * Use this instead of <Tabs> when chips can be multi-selected, when each
 * chip carries an inline count, or when the visual feel should be lighter
 * than the tab toggle.
 */
export function FilterChips<V extends string = string>(props: FilterChipsProps<V>) {
  const { options, size = 'md', className } = props;
  const s = SIZES[size];

  const isActive = (v: V) =>
    props.multiple ? props.value.includes(v) : props.value === v;

  const toggle = (v: V) => {
    if (props.multiple) {
      const set = new Set(props.value);
      if (set.has(v)) set.delete(v);
      else set.add(v);
      props.onChange(Array.from(set));
    } else {
      props.onChange(v);
    }
  };

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map((opt) => {
        const active = isActive(opt.value);
        const activeColor = ACTIVE_COLORS[opt.activeColor || 'emerald'];
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={cn(
              'inline-flex items-center rounded-full border font-bold transition-all',
              s.chip,
              active
                ? activeColor
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
            )}
          >
            {opt.icon}
            {opt.label}
            {opt.count !== undefined && (
              <span className={cn(
                'inline-flex items-center justify-center rounded-full font-bold',
                s.count,
                active ? 'bg-white/60' : 'bg-slate-100 text-slate-500'
              )}>
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
