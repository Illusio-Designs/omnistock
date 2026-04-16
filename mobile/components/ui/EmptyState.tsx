import { Text, View } from 'react-native';

type Props = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
};

export default function EmptyState({ icon, title, description }: Props) {
  return (
    <View className="py-16 items-center">
      {icon ? (
        <View className="w-16 h-16 rounded-3xl bg-slate-100 items-center justify-center mb-4">
          {icon}
        </View>
      ) : null}
      <Text className="text-base font-bold text-slate-700 tracking-tight">{title}</Text>
      {description ? (
        <Text className="text-sm text-slate-400 mt-1.5 text-center px-10 leading-5 font-medium">
          {description}
        </Text>
      ) : null}
    </View>
  );
}
