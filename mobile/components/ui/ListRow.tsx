import { Pressable, Text, View } from 'react-native';

type Props = {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  meta?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  isFirst?: boolean;
};

// Row used inside a Card to render a list of entities (orders, products,
// vendors, …). Mirrors the "Recent Transactions" row from the dashboard.
export default function ListRow({
  icon,
  title,
  subtitle,
  meta,
  right,
  onPress,
  isFirst,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-5 py-4 flex-row items-center active:bg-slate-50 ${
        isFirst ? '' : 'border-t border-slate-100'
      }`}
    >
      {icon ? (
        <View className="w-10 h-10 rounded-lg bg-emerald-50 items-center justify-center mr-3">
          {icon}
        </View>
      ) : null}
      <View className="flex-1">
        <Text className="font-bold text-slate-900 text-sm" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text className="text-[10px] text-slate-400 mt-0.5" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {right ? <View className="items-end ml-2">{right}</View> : null}
    </Pressable>
  );
}
