import { Pressable, ScrollView, Text } from 'react-native';

type Props = {
  options: string[];
  value: string;
  onChange: (v: string) => void;
};

export default function StatusFilter({ options, value, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 12, gap: 8 }}
    >
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            className={`px-4 py-2 rounded-xl ${
              active ? 'bg-emerald-600' : 'bg-white border border-slate-200'
            }`}
          >
            <Text
              className={`text-[13px] font-bold ${
                active ? 'text-white' : 'text-slate-600'
              }`}
            >
              {opt === 'ALL' ? 'All' : opt.charAt(0) + opt.slice(1).toLowerCase().replace('_', ' ')}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
