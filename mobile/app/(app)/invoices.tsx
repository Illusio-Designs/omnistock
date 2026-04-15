import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import ScreenStub from '../../components/ScreenStub';
import { billingApi } from '../../lib/api';

export default function InvoicesScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => (await billingApi.invoices()).data,
  });
  const items: any[] = data?.items ?? data ?? [];
  return (
    <ScreenStub
      title="Invoices"
      description={`${items.length} billing invoices`}
      loading={isLoading}
      error={error}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      {items.map((inv) => (
        <View key={inv.id} className="bg-white rounded-lg p-4 border border-slate-200 mb-2">
          <View className="flex-row justify-between">
            <Text className="font-semibold text-slate-900">
              #{inv.number ?? inv.id?.slice(0, 8)}
            </Text>
            <Text className="text-slate-500 text-xs">{inv.status}</Text>
          </View>
          <Text className="text-slate-900 mt-1">
            {inv.total != null ? `₹${inv.total}` : ''}
          </Text>
        </View>
      ))}
    </ScreenStub>
  );
}
