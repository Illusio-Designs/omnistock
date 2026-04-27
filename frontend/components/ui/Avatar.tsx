'use client';

import { cn } from '@/lib/utils';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type AvatarShape = 'circle' | 'rounded';

interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: AvatarSize;
  shape?: AvatarShape;
  className?: string;
  /** Override the auto-derived gradient. e.g. "from-violet-500 to-fuchsia-600" */
  gradient?: string;
}

const SIZES: Record<AvatarSize, { box: string; text: string }> = {
  xs: { box: 'w-6 h-6',   text: 'text-[10px]' },
  sm: { box: 'w-8 h-8',   text: 'text-xs' },
  md: { box: 'w-10 h-10', text: 'text-sm' },
  lg: { box: 'w-12 h-12', text: 'text-base' },
  xl: { box: 'w-20 h-20', text: 'text-2xl' },
};

// Stable color from name so the same person gets the same gradient everywhere.
const GRADIENTS = [
  'from-emerald-400 to-emerald-600',
  'from-sky-400 to-sky-600',
  'from-violet-500 to-fuchsia-600',
  'from-amber-400 to-orange-600',
  'from-rose-400 to-pink-600',
  'from-teal-400 to-cyan-600',
  'from-indigo-400 to-purple-600',
  'from-lime-400 to-emerald-600',
];

function pickGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function getInitial(name?: string | null) {
  if (!name) return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed[0].toUpperCase();
}

/**
 * Standard user/customer avatar — gradient bg + first-letter initial,
 * or an image when `src` is provided.
 *
 *   <Avatar name={user.name} size="md" />
 *   <Avatar name={customer.name} src={customer.photoUrl} size="lg" shape="rounded" />
 */
export function Avatar({ name, src, size = 'md', shape = 'rounded', className, gradient }: AvatarProps) {
  const s = SIZES[size];
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';
  const grad = gradient || pickGradient(name || '?');

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={cn('object-cover flex-shrink-0', s.box, shapeClass, className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex-shrink-0 flex items-center justify-center bg-gradient-to-br text-white font-bold shadow-sm',
        s.box,
        s.text,
        shapeClass,
        grad,
        className
      )}
      aria-label={name || undefined}
    >
      {getInitial(name)}
    </div>
  );
}
