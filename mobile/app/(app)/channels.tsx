import { useQuery } from '@tanstack/react-query';
import { Plug, Plus } from 'lucide-react-native';
import { Text, View } from 'react-native';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import PageShell from '../../components/ui/PageShell';
import { channelApi } from '../../lib/api';

export default function ChannelsScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => (await channelApi.list()).data,
  });
  const items: any[] = data?.items ?? data ?? [];

  return (
    <PageShell
      title="Channels"
      subtitle={`${items.length} connected`}
      action={
        <Button size="sm" leftIcon={<Plus size={12} color="#fff" />}>
          Connect
        </Button>
      }
      loading={isLoading}
      error={error}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      {items.length > 0 ? (
        items.map((c) => (
          <Card key={c.id} className="p-4 mb-3">
            <View className="flex-row items-center">
              <View className="w-11 h-11 rounded-xl bg-emerald-500 items-center justify-center mr-3">
                <Text className="text-white font-bold text-sm">
                  {String(c.name || '').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="font-bold text-slate-900" numberOfLines={1}>
                  {c.name}
                </Text>
                <Text className="text-xs text-slate-500 mt-0.5">
                  {c.type} · {c.category ?? 'marketplace'}
                </Text>
              </View>
              <Badge variant={c.status === 'connected' ? 'emerald' : 'slate'} dot>
                {c.status ?? 'disconnected'}
              </Badge>
            </View>
          </Card>
        ))
      ) : (
        <Card className="overflow-hidden">
          <EmptyState
            icon={<Plug size={24} color="#94a3b8" />}
            title="No channels connected"
            description="Connect Amazon, Flipkart, Shopify & more to sync orders."
          />
        </Card>
      )}
    </PageShell>
  );
}
