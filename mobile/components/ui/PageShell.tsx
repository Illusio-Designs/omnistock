import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
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

// Shared scrollable shell used by every feature screen so the page chrome
// (header, loading state, error banner, pull-to-refresh) stays consistent
// with the web frontend's DashboardLayout.
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
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor="#10b981" />
          ) : undefined
        }
      >
        <View className="flex-row items-start justify-between mb-5">
          <View className="flex-1 pr-3">
            <Text className="text-2xl font-bold text-slate-900 tracking-tight">{title}</Text>
            {subtitle ? (
              <Text className="text-sm text-slate-500 mt-1">{subtitle}</Text>
            ) : null}
          </View>
          {action}
        </View>

        {loading ? (
          <View className="py-8 items-center">
            <ActivityIndicator color="#10b981" />
          </View>
        ) : null}

        {error ? (
          <View className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-4">
            <Text className="text-rose-700 text-sm">
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
