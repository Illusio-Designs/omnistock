import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Plug, Plus } from 'lucide-react-native';
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

export default function ChannelsScreen() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [chName, setChName] = useState('');
  const [chType, setChType] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => (await channelApi.list()).data,
  });

  // Fetch the full catalog of channels supported by the backend
  const { data: catalogData } = useQuery({
    queryKey: ['channel-catalog'],
    queryFn: async () => (await channelApi.catalog()).data,
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => channelApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['channels'] });
      qc.invalidateQueries({ queryKey: ['channel-catalog'] });
      qc.invalidateQueries({ queryKey: ['dashboard-channels'] });
      setShowCreate(false);
      setChName(''); setChType('');
      Alert.alert('Success', 'Channel connected');
    },
    onError: (err: any) => {
      if (err?.response?.status === 402) {
        const { requiredPlan, currentPlan, metric, limit } = err.response.data || {};
        if (metric === 'channels') {
          Alert.alert(
            'Channel limit reached',
            `You've reached your plan's limit of ${limit} channels. Upgrade to add more.`
          );
        } else if (requiredPlan) {
          Alert.alert(
            'Upgrade needed',
            `This channel requires the ${requiredPlan} plan. You're on ${currentPlan}. Upgrade to unlock.`
          );
        } else {
          Alert.alert('Plan limit reached', err.response.data?.error || 'Please upgrade your plan.');
        }
      } else {
        Alert.alert('Error', err?.response?.data?.error || 'Failed to connect channel');
      }
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

  // Build dropdown options from the real catalog — show all entries, annotate status
  const catalog: any[] = catalogData?.catalog ?? [];
  const currentPlan: string = catalogData?.summary?.currentPlan ?? 'STANDARD';
  const maxChannels: number | null = catalogData?.summary?.maxChannels ?? null;
  const usedChannels: number = catalogData?.summary?.usedChannels ?? 0;
  const atChannelLimit = maxChannels != null && usedChannels >= maxChannels;
  const channelOptions = catalog.map((c) => {
    let suffix = '';
    if (c.status === 'connected') suffix = ' \u00B7 connected';
    else if (c.status === 'plan_locked') suffix = ` \u00B7 ${c.requiredPlan} plan`;
    else if (c.status === 'not_available') suffix = ' \u00B7 coming soon';
    return {
      label: `${c.name}${suffix}`,
      value: c.type,
    };
  });

  const selectedEntry = catalog.find((c) => c.type === chType);

  const onTypeChange = (value: string) => {
    const entry = catalog.find((c) => c.type === value);
    // Prevent selecting plan-locked or not-yet-available channels
    if (entry?.status === 'plan_locked') {
      Alert.alert(
        'Upgrade needed',
        `${entry.name} requires the ${entry.requiredPlan} plan. You're currently on ${currentPlan}.`
      );
      return;
    }
    if (entry?.status === 'not_available') {
      Alert.alert('Coming soon', `${entry.name} integration isn't ready yet.`);
      return;
    }
    setChType(value);
    if (entry && !chName.trim()) {
      setChName(entry.name);
    }
  };

  const onSubmit = () => {
    if (!chName.trim()) { Alert.alert('Required', 'Channel name is required'); return; }
    if (!chType) { Alert.alert('Required', 'Select a channel type'); return; }
    createMutation.mutate({
      name: chName.trim(),
      type: chType,
      category: selectedEntry?.category,
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
                  {c.type}{c.category ? ` \u00B7 ${c.category}` : ''}
                </Text>
              </View>
              <Badge variant={c.status === 'connected' ? 'emerald' : c.isActive === false ? 'slate' : 'emerald'} dot>
                {c.isActive === false ? 'disabled' : 'active'}
              </Badge>
            </View>

            {/* Last sync + error info */}
            {c.lastSyncAt || c.lastSyncError ? (
              <View className="bg-slate-50 rounded-xl p-3 mb-3">
                {c.lastSyncAt ? (
                  <Text className="text-[12px] text-slate-500 font-medium">
                    Last sync: {new Date(c.lastSyncAt).toLocaleString()}
                  </Text>
                ) : (
                  <Text className="text-[12px] text-slate-400 font-medium">Never synced yet</Text>
                )}
                {c.lastSyncError ? (
                  <Text className="text-[12px] text-rose-600 font-bold mt-1" numberOfLines={2}>
                    Error: {c.lastSyncError}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View className="flex-row gap-2 mb-2">
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
            <Button
              variant="ghost"
              size="sm"
              onPress={async () => {
                try {
                  const { data } = await channelApi.get(c.id);
                  Alert.alert(
                    'Webhook URL',
                    `Paste this in your ${c.type} seller/developer portal:\n\n${data.webhookUrl}`
                  );
                } catch (err: any) {
                  Alert.alert('Error', err?.response?.data?.error || 'Failed to fetch');
                }
              }}
            >
              Webhook URL
            </Button>
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
        {/* Current plan indicator */}
        <View className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center mb-2">
            <View className="w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center mr-3">
              <Lock size={14} color="#059669" />
            </View>
            <View className="flex-1">
              <Text className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">
                Your plan
              </Text>
              <Text className="text-[14px] font-extrabold text-slate-900">
                {currentPlan}
              </Text>
            </View>
            <Text className="text-[17px] font-extrabold text-slate-900">
              {usedChannels}
              {maxChannels != null ? (
                <Text className="text-slate-400 font-bold"> / {maxChannels}</Text>
              ) : null}
            </Text>
          </View>
          {maxChannels != null ? (
            <View className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <View
                className={`h-full rounded-full ${atChannelLimit ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, (usedChannels / maxChannels) * 100)}%` }}
              />
            </View>
          ) : null}
          {atChannelLimit ? (
            <Text className="text-[11px] text-rose-600 font-bold mt-2">
              Channel limit reached — upgrade to connect more
            </Text>
          ) : null}
        </View>

        <SelectField
          label="Channel Type"
          value={chType}
          onChange={onTypeChange}
          placeholder={channelOptions.length ? 'Select from supported channels' : 'Loading...'}
          options={channelOptions}
        />
        <FormInput label="Channel Name" value={chName} onChangeText={setChName} placeholder="e.g. My Amazon Store" />

        {selectedEntry ? (
          selectedEntry.manualOnly ? (
            <View className="bg-sky-50 border border-sky-200 rounded-2xl p-4 mb-4">
              <Text className="text-[12px] font-bold text-sky-800">
                Manual channel — no API connection
              </Text>
              <Text className="text-[11px] text-sky-700 font-medium mt-1">
                Connect once; then enter orders against it via the New Order form.
              </Text>
            </View>
          ) : (
            <View className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-4">
              <Text className="text-[12px] font-bold text-emerald-700">
                {selectedEntry.tagline || 'Channel integration'}
              </Text>
              {selectedEntry.features?.length ? (
                <Text className="text-[11px] text-emerald-600 font-medium mt-1">
                  Features: {selectedEntry.features.join(', ')}
                </Text>
              ) : null}
            </View>
          )
        ) : null}

        <Button
          onPress={onSubmit}
          loading={createMutation.isPending}
          disabled={!chType || selectedEntry?.status === 'plan_locked' || selectedEntry?.status === 'not_available'}
          className="mt-2"
        >
          Connect Channel
        </Button>
      </BottomSheet>
    </PageShell>
  );
}
