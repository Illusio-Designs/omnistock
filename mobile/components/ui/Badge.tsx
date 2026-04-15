import { Text, View } from 'react-native';

type Variant = 'emerald' | 'rose' | 'slate' | 'amber';

type Props = {
  variant?: Variant;
  dot?: boolean;
  children: React.ReactNode;
};

const STYLES: Record<Variant, { bg: string; text: string; dot: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
};

export default function Badge({ variant = 'slate', dot, children }: Props) {
  const s = STYLES[variant];
  return (
    <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full ${s.bg}`}>
      {dot ? <View className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> : null}
      <Text className={`text-[10px] font-bold ${s.text}`}>{children}</Text>
    </View>
  );
}
