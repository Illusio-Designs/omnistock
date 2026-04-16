import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  loading?: boolean;
  error?: unknown;
  refreshing?: boolean;
  onRefresh?: () => void;
  children?: React.ReactNode;
};

export default function PageShell({
  title,
  subtitle,
  action,
  loading,
  error,
  refreshing,
  onRefresh,
  children,
}: Props) {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor="#10b981"
              colors={['#10b981']}
            />
          ) : undefined
        }
      >
        <View className="flex-row items-end justify-between mb-6 mt-2">
          <View className="flex-1 pr-3">
            <Text className="text-[28px] font-extrabold text-slate-900 tracking-tight leading-tight">
              {title}
            </Text>
            {subtitle ? (
              <Text className="text-sm text-slate-400 mt-1 font-medium">{subtitle}</Text>
            ) : null}
          </View>
          {action}
        </View>

        {loading ? (
          <View className="py-12 items-center">
            <View className="w-12 h-12 rounded-2xl bg-emerald-50 items-center justify-center">
              <ActivityIndicator color="#10b981" size="small" />
            </View>
          </View>
        ) : null}

        {error ? (
          <View className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-5">
            <Text className="text-rose-600 text-sm font-semibold">
              {(error as any)?.response?.data?.message ||
                (error as any)?.message ||
                'Failed to load'}
            </Text>
          </View>
        ) : null}

        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
