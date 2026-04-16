import { Text, TextInput, TextInputProps, View } from 'react-native';

type Props = TextInputProps & {
  label: string;
  icon?: React.ReactNode;
  error?: string;
};

export default function FormInput({ label, icon, error, ...rest }: Props) {
  return (
    <View className="mb-4">
      <Text className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-2">
        {label}
      </Text>
      <View
        className={`flex-row items-center bg-slate-50 border rounded-2xl px-4 ${
          error ? 'border-rose-300' : 'border-slate-200'
        }`}
      >
        {icon ? <View className="mr-2">{icon}</View> : null}
        <TextInput
          placeholderTextColor="#94a3b8"
          className="flex-1 py-3.5 text-slate-900 text-[15px]"
          {...rest}
        />
      </View>
      {error ? (
        <Text className="text-rose-500 text-xs font-medium mt-1 ml-1">{error}</Text>
      ) : null}
    </View>
  );
}
