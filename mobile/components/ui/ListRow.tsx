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
      className={`px-5 py-4 flex-row items-center active:bg-slate-50/80 ${
        isFirst ? '' : 'border-t border-slate-100/80'
      }`}
    >
      {icon ? (
        <View
          className="w-11 h-11 rounded-2xl bg-gradient-to-br bg-emerald-50 items-center justify-center mr-3.5"
          style={{
            shadowColor: '#06D4B8',
            shadowOpacity: 0.1,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
          }}
        >
          {icon}
        </View>
      ) : null}
      <View className="flex-1">
        <Text className="font-bold text-slate-900 text-[15px] tracking-tight" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-[13px] text-slate-500 mt-0.5 font-medium" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text className="text-[11px] text-slate-400 mt-0.5 font-medium" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {right ? <View className="items-end ml-3">{right}</View> : null}
    </Pressable>
  );
}
