import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

type BadgeVariant =
  | 'default' | 'emerald' | 'blue' | 'amber' | 'rose' | 'slate' | 'violet'
  | 'outline';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const VARIANTS: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200',
  emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
  blue:    'bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
  amber:   'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  rose:    'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
  slate:   'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-600/60',
  violet:  'bg-violet-50 text-violet-700 border border-violet-100 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30',
  outline: 'bg-transparent text-slate-700 border border-slate-200 dark:text-slate-300 dark:border-slate-600/60',
};

const DOT_COLORS: Record<BadgeVariant, string> = {
  default: 'bg-slate-500',
  emerald: 'bg-emerald-500',
  blue:    'bg-blue-500',
  amber:   'bg-amber-500',
  rose:    'bg-rose-500',
  slate:   'bg-slate-500',
  violet:  'bg-violet-500',
  outline: 'bg-slate-500',
};

export function Badge({ variant = 'default', dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold',
        VARIANTS[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', DOT_COLORS[variant])} />}
      {children}
    </span>
  );
}
