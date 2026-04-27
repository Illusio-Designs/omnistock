'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  iconBg?: string;       // e.g. 'bg-emerald-50 text-emerald-600'
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { wrap: 'p-8',  iconBox: 'w-12 h-12', title: 'text-sm', desc: 'text-xs' },
  md: { wrap: 'p-12', iconBox: 'w-16 h-16', title: 'text-base font-bold', desc: 'text-sm' },
  lg: { wrap: 'p-16', iconBox: 'w-20 h-20', title: 'text-lg font-bold', desc: 'text-sm' },
};

/**
 * Standard "No X yet" placeholder. Drop into the body of a `<Card>` or
 * directly inside a list container.
 *
 *   <EmptyState
 *     icon={<Building2 size={28} />}
 *     iconBg="bg-emerald-50 text-emerald-600"
 *     title="No vendors yet"
 *     description="Add your first supplier to start creating purchase orders."
 *     action={<Button leftIcon={<Plus size={14} />}>New Vendor</Button>}
 *   />
 */
export function EmptyState({
  icon, iconBg = 'bg-slate-100 text-slate-500', title, description, action, className, size = 'md',
}: EmptyStateProps) {
  const s = SIZES[size];
  return (
    <div className={cn('text-center', s.wrap, className)}>
      {icon && (
        <div className={cn(
          'inline-flex items-center justify-center rounded-2xl mb-4',
          s.iconBox, iconBg
        )}>
          {icon}
        </div>
      )}
      <h3 className={cn('text-slate-900', s.title)}>{title}</h3>
      {description && <p className={cn('text-slate-500 mt-1', s.desc)}>{description}</p>}
      {action && <div className="mt-5 inline-flex">{action}</div>}
    </div>
  );
}
