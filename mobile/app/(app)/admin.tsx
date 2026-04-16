import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { Building2, CreditCard, TrendingUp, Users } from 'lucide-react-native';
import { Text, View } from 'react-native';
import Card from '../../components/ui/Card';
import PageShell from '../../components/ui/PageShell';
import { adminApi } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { useAuthStore } from '../../store/auth.store';

type Metric = { label: string; value: string; icon: React.ReactNode };

export default function AdminScreen() {
  const isAdmin = useAuthStore((s) => s.isPlatformAdmin());

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => (await adminApi.stats()).data,
    enabled: isAdmin,
  });

  if (!isAdmin) return <Redirect href="/dashboard" />;

  const metrics: Metric[] = [
    {
      label: 'Tenants',
      value: (data?.tenants ?? '—').toString(),
      icon: <Building2 size={15} color="#059669" />,
    },
    {
      label: 'Active subs',
      value: (data?.activeSubscriptions ?? '—').toString(),
      icon: <CreditCard size={15} color="#059669" />,
    },
    {
      label: 'MRR',
      value: data?.mrr != null ? formatCurrency(data.mrr) : '—',
      icon: <TrendingUp size={15} color="#059669" />,
    },
    {
      label: 'Users',
      value: (data?.users ?? '—').toString(),
      icon: <Users size={15} color="#059669" />,
    },
  ];

  return (
    <PageShell
      title="Platform Admin"
      subtitle="Global SaaS overview"
      loading={isLoading}
      error={error}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      <View className="flex-row flex-wrap -mx-2">
        {metrics.map((m) => (
          <View key={m.label} className="w-1/2 px-2 mb-4">
            <Card className="p-4">
              <View className="flex-row items-center mb-3">
                <View className="w-8 h-8 rounded-lg bg-emerald-50 items-center justify-center mr-2">
                  {m.icon}
                </View>
                <Text className="text-xs font-bold text-slate-700 flex-1" numberOfLines={1}>
                  {m.label}
                </Text>
              </View>
              <Text className="text-xl font-bold text-slate-900" numberOfLines={1}>
                {m.value}
              </Text>
            </Card>
          </View>
        ))}
      </View>
    </PageShell>
  );
}
