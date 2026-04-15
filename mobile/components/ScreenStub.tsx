import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  title: string;
  description?: string;
  loading?: boolean;
  error?: unknown;
  refreshing?: boolean;
  onRefresh?: () => void;
  children?: React.ReactNode;
};

// Shared placeholder used by screens that have been scaffolded but not
// fully ported from the web frontend yet. Fleshing out each feature happens
// incrementally — this keeps the app navigable in the meantime.
export default function ScreenStub({
  title,
  description,
  loading,
  error,
  refreshing,
  onRefresh,
  children,
}: Props) {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        <Text className="text-2xl font-bold text-slate-900">{title}</Text>
        {description ? (
          <Text className="text-slate-500 mt-1 mb-4">{description}</Text>
        ) : (
          <View className="h-4" />
        )}
        {loading ? (
          <View className="py-8 items-center">
            <ActivityIndicator />
          </View>
        ) : null}
        {error ? (
          <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <Text className="text-red-700 text-sm">
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
