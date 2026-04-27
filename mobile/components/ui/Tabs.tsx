import { Pressable, Text, View } from 'react-native';

export interface TabItem<K extends string = string> {
  key: K;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
  disabled?: boolean;
}

interface TabsProps<K extends string = string> {
  value: K;
  onChange: (key: K) => void;
  items: TabItem<K>[];
  size?: 'sm' | 'md';
  className?: string;
}

const SIZES = {
  sm: { py: 'py-1', text: 'text-[11px]' },
  md: { py: 'py-1.5', text: 'text-[12px]' },
};

/**
 * Mobile equivalent of the web <Tabs> — pill toggle row backed by Pressable.
 *
 *   <Tabs value={tab} onChange={setTab} items={[
 *     { key: 'all',    label: 'All' },
 *     { key: 'auto',   label: 'Auto Fulfill' },
 *     { key: 'manual', label: 'Manual' },
 *   ]} />
 */
export default function Tabs<K extends string = string>({
  value, onChange, items, size = 'md', className = '',
}: TabsProps<K>) {
  const s = SIZES[size];
  return (
    <View className={`flex-row p-1 bg-slate-100 rounded-xl ${className}`}>
      {items.map((it) => {
        const active = it.key === value;
        return (
          <Pressable
            key={it.key}
            onPress={() => !it.disabled && onChange(it.key)}
            disabled={it.disabled}
            className={`flex-1 flex-row items-center justify-center rounded-lg ${s.py} ${active ? 'bg-white' : ''} ${it.disabled ? 'opacity-50' : ''}`}
            style={
              active
                ? { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 }
                : undefined
            }
          >
            {it.icon ? <View className="mr-1.5">{it.icon}</View> : null}
            <Text className={`${s.text} font-bold ${active ? 'text-slate-900' : 'text-slate-500'}`}>
              {it.label}
            </Text>
            {it.badge !== undefined && it.badge !== null && it.badge !== 0 ? (
              <View className={`ml-1.5 min-w-[18px] h-[18px] px-1 rounded-full items-center justify-center ${active ? 'bg-emerald-100' : 'bg-slate-200'}`}>
                <Text className={`text-[10px] font-bold ${active ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {it.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
