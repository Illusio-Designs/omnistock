import { useQuery } from '@tanstack/react-query';
import { BarChart3, Package, TrendingUp, Wallet } from 'lucide-react-native';
import { Text, View } from 'react-native';
import Card from '../../components/ui/Card';
import PageShell from '../../components/ui/PageShell';
import { reportApi } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

type Metric = { label: string; value: string; icon: React.ReactNode; bg: string };

export default function ReportsScreen() {
  const sales = useQuery({
    queryKey: ['reports', 'sales'],
    queryFn: async () => (await reportApi.sales()).data,
  });

  const valuation = useQuery({
    queryKey: ['reports', 'valuation'],
    queryFn: async () => (await reportApi.inventoryValuation()).data,
  });

  const topProducts = useQuery({
    queryKey: ['reports', 'top'],
    queryFn: async () => (await reportApi.topProducts()).data,
  });

  const metrics: Metric[] = [
    {
      label: 'Total sales',
      value: sales.data?.total != null ? formatCurrency(sales.data.total) : '—',
      icon: <Wallet size={15} color="#059669" />,
      bg: 'bg-emerald-50',
    },
    {
      label: 'Orders',
      value: sales.data?.count?.toString() ?? '—',
      icon: <TrendingUp size={15} color="#059669" />,
      bg: 'bg-emerald-50',
    },
    {
      label: 'Inventory value',
      value: valuation.data?.total != null ? formatCurrency(valuation.data.total) : '—',
      icon: <Package size={15} color="#0284c7" />,
      bg: 'bg-sky-50',
    },
    {
      label: 'Top SKUs',
      value: (topProducts.data?.items?.length ?? topProducts.data?.length ?? 0).toString(),
      icon: <BarChart3 size={15} color="#0284c7" />,
      bg: 'bg-sky-50',
    },
  ];

  const top: any[] =
    topProducts.data?.items ?? (Array.isArray(topProducts.data) ? topProducts.data : []);

  const refreshAll = () => {
    sales.refetch();
    valuation.refetch();
    topProducts.refetch();
  };

  return (
    <PageShell
      title="Reports"
      subtitle="Sales and inventory analytics"
      loading={sales.isLoading || valuation.isLoading || topProducts.isLoading}
      error={sales.error || valuation.error || topProducts.error}
      refreshing={sales.isRefetching || valuation.isRefetching || topProducts.isRefetching}
      onRefresh={refreshAll}
    >
      <View className="flex-row flex-wrap -mx-2 mb-2">
        {metrics.map((m) => (
          <View key={m.label} className="w-1/2 px-2 mb-4">
            <Card className="p-4">
              <View className="flex-row items-center mb-3">
                <View className={`w-8 h-8 rounded-lg ${m.bg} items-center justify-center mr-2`}>
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

      <Card className="p-5">
        <Text className="font-bold text-slate-900 mb-3">Top products</Text>
        {top.length > 0 ? (
          top.slice(0, 5).map((p, idx) => (
            <View
              key={p.id ?? idx}
              className={`flex-row items-center py-3 ${
                idx > 0 ? 'border-t border-slate-100' : ''
              }`}
            >
              <View className="w-8 h-8 rounded-lg bg-emerald-50 items-center justify-center mr-3">
                <Text className="text-xs font-bold text-emerald-700">{idx + 1}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                  {p.name ?? p.productName ?? `Product ${idx + 1}`}
                </Text>
                <Text className="text-xs text-slate-500">
                  {p.qty ?? p.quantity ?? 0} sold
                </Text>
              </View>
              <Text className="text-sm font-bold text-slate-900">
                {p.revenue != null ? formatCurrency(p.revenue) : ''}
              </Text>
            </View>
          ))
        ) : (
          <Text className="text-sm text-slate-400 text-center py-6">No data yet</Text>
        )}
      </Card>
    </PageShell>
  );
}
