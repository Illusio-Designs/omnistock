import { Text, View } from 'react-native';

type Variant = 'emerald' | 'rose' | 'slate' | 'amber' | 'sky' | 'violet';

type Props = {
  variant?: Variant;
  dot?: boolean;
  children: React.ReactNode;
};

const STYLES: Record<Variant, { bg: string; text: string; dot: string }> = {
  emerald: { bg: 'bg-emerald-50 border border-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  rose: { bg: 'bg-rose-50 border border-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
  slate: { bg: 'bg-slate-50 border border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400' },
  amber: { bg: 'bg-amber-50 border border-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  sky: { bg: 'bg-sky-50 border border-sky-100', text: 'text-sky-700', dot: 'bg-sky-500' },
  violet: { bg: 'bg-violet-50 border border-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
};

export default function Badge({ variant = 'slate', dot, children }: Props) {
  const s = STYLES[variant];
  return (
    <View className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full ${s.bg}`}>
      {dot ? <View className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> : null}
      <Text className={`text-[10px] font-extrabold tracking-wide uppercase ${s.text}`}>
        {children}
      </Text>
    </View>
  );
}
