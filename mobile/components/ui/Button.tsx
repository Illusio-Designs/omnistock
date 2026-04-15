import { ActivityIndicator, Pressable, Text, View } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md';

type Props = {
  variant?: Variant;
  size?: Size;
  leftIcon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  className?: string;
};

const BASE: Record<Variant, string> = {
  primary: 'bg-emerald-600 active:bg-emerald-700',
  secondary: 'bg-white border border-slate-200 active:bg-slate-50',
  ghost: 'bg-transparent active:bg-slate-100',
};

const TEXT: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-slate-700',
  ghost: 'text-slate-700',
};

const PAD: Record<Size, string> = {
  sm: 'px-3 py-2',
  md: 'px-4 py-2.5',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  leftIcon,
  loading,
  disabled,
  onPress,
  children,
  className = '',
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`flex-row items-center justify-center rounded-lg ${BASE[variant]} ${PAD[size]} ${
        disabled || loading ? 'opacity-60' : ''
      } ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#0f172a'} size="small" />
      ) : (
        <View className="flex-row items-center">
          {leftIcon ? <View className="mr-1.5">{leftIcon}</View> : null}
          <Text className={`text-xs font-bold ${TEXT[variant]}`}>{children}</Text>
        </View>
      )}
    </Pressable>
  );
}
