import { Text, View } from 'react-native';

type Props = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
};

export default function EmptyState({ icon, title, description }: Props) {
  return (
    <View className="py-12 items-center">
      {icon ? <View className="mb-2">{icon}</View> : null}
      <Text className="text-sm font-bold text-slate-700">{title}</Text>
      {description ? (
        <Text className="text-xs text-slate-400 mt-1 text-center px-8">{description}</Text>
      ) : null}
    </View>
  );
}
