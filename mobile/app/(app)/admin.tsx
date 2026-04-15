import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';
import ScreenStub from '../../components/ScreenStub';
import { adminApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

export default function AdminScreen() {
  const isAdmin = useAuthStore((s) => s.isPlatformAdmin)();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => (await adminApi.stats()).data,
    enabled: isAdmin,
  });

  if (!isAdmin) return <Redirect href="/dashboard" />;

  const metrics: { label: string; value: string | number }[] = [
    { label: 'Tenants', value: data?.tenants ?? '—' },
    { label: 'Active subs', value: data?.activeSubscriptions ?? '—' },
    { label: 'MRR', value: data?.mrr ?? '—' },
    { label: 'Users', value: data?.users ?? '—' },
  ];

  return (
    <ScreenStub
      title="Platform Admin"
      description="Global SaaS overview"
      loading={isLoading}
      error={error}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      <View className="flex-row flex-wrap -mx-2">
        {metrics.map((m) => (
          <View key={m.label} className="w-1/2 px-2 mb-4">
            <View className="bg-white rounded-xl p-4 border border-slate-200">
              <Text className="text-slate-500 text-xs uppercase">{m.label}</Text>
              <Text className="text-2xl font-bold text-slate-900 mt-1">
                {String(m.value)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScreenStub>
  );
}
