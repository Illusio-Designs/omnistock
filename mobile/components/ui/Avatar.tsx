import { Image, Text, View } from 'react-native';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type Shape = 'circle' | 'rounded';

interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: Size;
  shape?: Shape;
  className?: string;
  /** Override the auto-derived background. Tailwind class like 'bg-violet-500'. */
  bg?: string;
}

const SIZES: Record<Size, { box: string; text: string; px: number }> = {
  xs: { box: 'w-6 h-6',   text: 'text-[10px]', px: 24 },
  sm: { box: 'w-8 h-8',   text: 'text-xs',     px: 32 },
  md: { box: 'w-10 h-10', text: 'text-sm',     px: 40 },
  lg: { box: 'w-12 h-12', text: 'text-base',   px: 48 },
  xl: { box: 'w-20 h-20', text: 'text-2xl',    px: 80 },
};

// Stable color from name so the same person gets the same background everywhere.
const COLORS = [
  'bg-emerald-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-lime-500',
];

function pickColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitial(name?: string | null) {
  if (!name) return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed[0].toUpperCase();
}

/**
 * Mobile equivalent of the web <Avatar>. Shows an image when `src` is given,
 * otherwise a colored block with the first-letter initial.
 *
 *   <Avatar name={user.name} size="md" />
 *   <Avatar name={c.name} src={c.photoUrl} size="lg" shape="rounded" />
 */
export default function Avatar({
  name, src, size = 'md', shape = 'rounded', className = '', bg,
}: AvatarProps) {
  const s = SIZES[size];
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';
  const bgClass = bg || pickColor(name || '?');

  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={{ width: s.px, height: s.px }}
        className={`${shapeClass} ${className}`}
      />
    );
  }

  return (
    <View
      className={`${s.box} ${shapeClass} ${bgClass} items-center justify-center ${className}`}
    >
      <Text className={`${s.text} font-bold text-white`}>
        {getInitial(name)}
      </Text>
    </View>
  );
}
