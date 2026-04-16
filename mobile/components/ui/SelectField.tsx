import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';

type Option = { label: string; value: string };

type Props = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function SelectField({ label, value, options, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View className="mb-4">
      <Text className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-2">
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5"
      >
        <Text
          className={`flex-1 text-[15px] ${selected ? 'text-slate-900' : 'text-slate-400'}`}
        >
          {selected?.label || placeholder || 'Select...'}
        </Text>
        <ChevronDown size={18} color="#94a3b8" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <Pressable className="flex-1" onPress={() => setOpen(false)} />
          <View className="bg-white rounded-t-3xl max-h-[60%]">
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 rounded-full bg-slate-300" />
            </View>
            <Text className="text-lg font-extrabold text-slate-900 tracking-tight px-6 py-3">
              {label}
            </Text>
            <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
              {options.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`flex-row items-center px-6 py-4 active:bg-slate-50 ${
                    opt.value === value ? 'bg-emerald-50' : ''
                  }`}
                >
                  <Text
                    className={`flex-1 text-[15px] font-medium ${
                      opt.value === value ? 'text-emerald-700 font-bold' : 'text-slate-700'
                    }`}
                  >
                    {opt.label}
                  </Text>
                  {opt.value === value ? <Check size={18} color="#059669" /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
