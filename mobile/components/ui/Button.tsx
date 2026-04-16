import { ActivityIndicator, Pressable, Text, View } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

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
  secondary: 'bg-slate-900 active:bg-slate-800',
  ghost: 'bg-transparent border border-slate-200 active:bg-slate-50',
  danger: 'bg-rose-600 active:bg-rose-700',
};

const TEXT: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-white',
  ghost: 'text-slate-700',
  danger: 'text-white',
};

const PAD: Record<Size, string> = {
  sm: 'px-4 py-2.5',
  md: 'px-5 py-3',
  lg: 'px-6 py-3.5',
};

const FONT: Record<Size, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
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
      className={`flex-row items-center justify-center rounded-2xl ${BASE[variant]} ${PAD[size]} ${
        disabled || loading ? 'opacity-50' : ''
      } ${className}`}
      style={
        variant === 'primary'
          ? {
              shadowColor: '#10b981',
              shadowOpacity: 0.3,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }
          : undefined
      }
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'ghost' ? '#0f172a' : '#fff'}
          size="small"
        />
      ) : (
        <View className="flex-row items-center">
          {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
          <Text className={`${FONT[size]} font-bold ${TEXT[variant]}`}>
            {children}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
