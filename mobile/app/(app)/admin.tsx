import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { Building2, CreditCard, TrendingUp, Users } from 'lucide-react-native';
import { Text, View } from 'react-native';
import Card from '../../components/ui/Card';
import PageShell from '../../components/ui/PageShell';
import { MetricCardSkeleton } from '../../components/ui/Shimmer';
import { adminApi } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { useAuthStore } from '../../store/auth.store';

type Metric = { label: string; value: string; icon: React.ReactNode; color: string; bg: string };

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
      value: (data?.tenants ?? '\u2014').toString(),
      icon: <Building2 size={18} color="#059669" />,
      color: '#10b981',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Active subs',
      value: (data?.activeSubscriptions ?? '\u2014').toString(),
      icon: <CreditCard size={18} color="#0ea5e9" />,
      color: '#0ea5e9',
      bg: 'bg-sky-50',
    },
    {
      label: 'MRR',
      value: data?.mrr != null ? formatCurrency(data.mrr) : '\u2014',
      icon: <TrendingUp size={18} color="#8b5cf6" />,
      color: '#8b5cf6',
      bg: 'bg-violet-50',
    },
    {
      label: 'Users',
      value: (data?.users ?? '\u2014').toString(),
      icon: <Users size={18} color="#f59e0b" />,
      color: '#f59e0b',
      bg: 'bg-amber-50',
    },
  ];

  return (
    <PageShell
      title="Platform Admin"
      subtitle="Global SaaS overview"
      loading={isLoading}
      skeleton={
        <View className="flex-row flex-wrap gap-4">
          <View className="w-[47%]"><MetricCardSkeleton /></View>
          <View className="w-[47%]"><MetricCardSkeleton /></View>
          <View className="w-[47%]"><MetricCardSkeleton /></View>
          <View className="w-[47%]"><MetricCardSkeleton /></View>
        </View>
      }
      error={error}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      <View className="flex-row flex-wrap gap-4">
        {metrics.map((m) => (
          <View key={m.label} className="w-[47%]">
            <Card className="p-5">
              <View
                className={`w-10 h-10 rounded-2xl ${m.bg} items-center justify-center mb-3`}
                style={{
                  shadowColor: m.color,
                  shadowOpacity: 0.12,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 1,
                }}
              >
                {m.icon}
              </View>
              <Text className="text-2xl font-extrabold text-slate-900 tracking-tight" numberOfLines={1}>
                {m.value}
              </Text>
              <Text className="text-[13px] text-slate-500 font-medium mt-1" numberOfLines={1}>
                {m.label}
              </Text>
            </Card>
          </View>
        ))}
      </View>
    </PageShell>
  );
}
