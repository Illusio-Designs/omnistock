import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plug, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import Badge from '../../components/ui/Badge';
import BottomSheet from '../../components/ui/BottomSheet';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import FormInput from '../../components/ui/FormInput';
import PageShell from '../../components/ui/PageShell';
import SelectField from '../../components/ui/SelectField';
import { ShimmerBox } from '../../components/ui/Shimmer';
import { channelApi } from '../../lib/api';

const CHANNEL_TYPES = [
  { label: 'Amazon', value: 'AMAZON' },
  { label: 'Flipkart', value: 'FLIPKART' },
  { label: 'Shopify', value: 'SHOPIFY' },
  { label: 'WooCommerce', value: 'WOOCOMMERCE' },
  { label: 'Custom Website', value: 'WEBSITE' },
  { label: 'Offline / POS', value: 'OFFLINE' },
];

export default function ChannelsScreen() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [chName, setChName] = useState('');
  const [chType, setChType] = useState('');
  const [chCategory, setChCategory] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => (await channelApi.list()).data,
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => channelApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['channels'] });
      qc.invalidateQueries({ queryKey: ['dashboard-channels'] });
      setShowCreate(false);
      setChName(''); setChType(''); setChCategory('');
      Alert.alert('Success', 'Channel connected');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to connect channel');
    },
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => channelApi.syncOrders(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      Alert.alert('Success', 'Orders synced');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'Sync failed');
    },
  });

  const onSubmit = () => {
    if (!chName.trim()) { Alert.alert('Required', 'Channel name is required'); return; }
    if (!chType) { Alert.alert('Required', 'Select a channel type'); return; }
    createMutation.mutate({
      name: chName.trim(),
      type: chType,
      category: chCategory || undefined,
    });
  };

  const items: any[] = data?.items ?? data ?? [];

  return (
    <PageShell
      title="Channels"
      subtitle={`${items.length} connected`}
      action={
        <Button size="sm" leftIcon={<Plus size={14} color="#fff" />} onPress={() => setShowCreate(true)}>
          Connect
        </Button>
      }
      loading={isLoading}
      skeleton={
        <View>
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5 mb-4">
              <View className="flex-row items-center">
                <ShimmerBox width={48} height={48} borderRadius={16} />
                <View className="flex-1 ml-4">
                  <ShimmerBox width="65%" height={16} borderRadius={8} />
                  <ShimmerBox width="40%" height={12} borderRadius={6} style={{ marginTop: 8 }} />
                </View>
                <ShimmerBox width={70} height={24} borderRadius={12} />
              </View>
            </Card>
          ))}
        </View>
      }
      error={error}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      {items.length > 0 ? (
        items.map((c) => (
          <Card key={c.id} className="p-5 mb-4">
            <View className="flex-row items-center mb-3">
              <View
                className="w-12 h-12 rounded-2xl bg-slate-900 items-center justify-center mr-4"
                style={{
                  shadowColor: '#0f172a',
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                }}
              >
                <Text className="text-white font-extrabold text-sm">
                  {String(c.name || '').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-slate-900 tracking-tight" numberOfLines={1}>
                  {c.name}
                </Text>
                <Text className="text-[13px] text-slate-500 font-medium mt-0.5">
                  {c.type} {c.category ? `\u00B7 ${c.category}` : ''}
                </Text>
              </View>
              <Badge variant={c.status === 'connected' ? 'emerald' : 'slate'} dot>
                {c.status ?? 'disconnected'}
              </Badge>
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => syncMutation.mutate(c.id)}
                  loading={syncMutation.isPending}
                >
                  Sync Orders
                </Button>
              </View>
              <View className="flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => channelApi.syncInventory(c.id).then(() => Alert.alert('Done', 'Inventory synced')).catch(() => Alert.alert('Error', 'Sync failed'))}
                >
                  Sync Inventory
                </Button>
              </View>
            </View>
          </Card>
        ))
      ) : (
        <Card className="overflow-hidden">
          <EmptyState
            icon={<Plug size={28} color="#94a3b8" />}
            title="No channels connected"
            description="Connect Amazon, Flipkart, Shopify & more to sync orders."
          />
        </Card>
      )}

      <BottomSheet visible={showCreate} onClose={() => setShowCreate(false)} title="Connect Channel">
        <FormInput label="Channel Name" value={chName} onChangeText={setChName} placeholder="e.g. My Amazon Store" />
        <SelectField
          label="Channel Type"
          value={chType}
          onChange={setChType}
          placeholder="Select type"
          options={CHANNEL_TYPES}
        />
        <FormInput label="Category" value={chCategory} onChangeText={setChCategory} placeholder="e.g. marketplace, D2C (optional)" />

        <Button onPress={onSubmit} loading={createMutation.isPending} className="mt-2">
          Connect Channel
        </Button>
      </BottomSheet>
    </PageShell>
  );
}
