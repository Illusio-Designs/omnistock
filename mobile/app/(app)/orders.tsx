import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, ShoppingCart } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import Badge from '../../components/ui/Badge';
import BottomSheet from '../../components/ui/BottomSheet';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import FormInput from '../../components/ui/FormInput';
import ListRow from '../../components/ui/ListRow';
import PageShell from '../../components/ui/PageShell';
import StatusFilter from '../../components/ui/StatusFilter';
import { orderApi, customerApi, channelApi } from '../../lib/api';
import { orderStatusVariant } from '../../lib/statusColors';
import { formatCurrency, formatShortDate } from '../../lib/utils';
import SelectField from '../../components/ui/SelectField';

const STATUSES = ['ALL', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function OrdersScreen() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('ALL');
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemSku, setItemSku] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemPrice, setItemPrice] = useState('');
  const [notes, setNotes] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['orders', filter],
    queryFn: async () => {
      const params: any = {};
      if (filter !== 'ALL') params.status = filter;
      return (await orderApi.list(params)).data;
    },
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-select'],
    queryFn: async () => (await customerApi.list()).data,
    enabled: showCreate,
  });

  const { data: channelsData } = useQuery({
    queryKey: ['channels-select'],
    queryFn: async () => (await channelApi.list()).data,
    enabled: showCreate,
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => orderApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowCreate(false);
      resetForm();
      Alert.alert('Success', 'Order created');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to create order');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      orderApi.updateStatus(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to update status');
    },
  });

  const resetForm = () => {
    setCustomerId('');
    setChannelId('');
    setItemName('');
    setItemSku('');
    setItemQty('1');
    setItemPrice('');
    setNotes('');
  };

  const onSubmit = () => {
    if (!itemName || !itemPrice) {
      Alert.alert('Required', 'Item name and price are required');
      return;
    }
    createMutation.mutate({
      customerId: customerId || undefined,
      channelId: channelId || undefined,
      notes,
      items: [
        {
          productName: itemName,
          sku: itemSku || undefined,
          quantity: parseInt(itemQty) || 1,
          unitPrice: parseFloat(itemPrice),
        },
      ],
    });
  };

  const getNextStatus = (current: string) => {
    const flow: Record<string, string> = {
      PENDING: 'CONFIRMED',
      CONFIRMED: 'PROCESSING',
      PROCESSING: 'SHIPPED',
      SHIPPED: 'DELIVERED',
    };
    return flow[current];
  };

  const onStatusAction = (id: string, current: string) => {
    const next = getNextStatus(current);
    if (!next) return;
    Alert.alert(
      'Update Status',
      `Move this order to ${next}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: next, onPress: () => statusMutation.mutate({ id, status: next }) },
        ...(current !== 'DELIVERED' && current !== 'CANCELLED'
          ? [{ text: 'Cancel Order', style: 'destructive' as const, onPress: () => statusMutation.mutate({ id, status: 'CANCELLED' }) }]
          : []),
      ]
    );
  };

  const items: any[] = data?.items ?? data ?? [];
  const customers: any[] = customersData?.items ?? customersData ?? [];
  const channels: any[] = channelsData?.items ?? channelsData ?? [];

  return (
    <PageShell
      title="Orders"
      subtitle={`${items.length} orders`}
      action={
        <Button size="sm" leftIcon={<Plus size={12} color="#fff" />} onPress={() => setShowCreate(true)}>
          New Order
        </Button>
      }
      loading={isLoading}
      error={error}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      <StatusFilter options={STATUSES} value={filter} onChange={setFilter} />

      <Card className="overflow-hidden">
        {items.length > 0 ? (
          items.map((o, idx) => (
            <ListRow
              key={o.id}
              isFirst={idx === 0}
              icon={<Package size={15} color="#059669" />}
              title={`#${o.orderNumber ?? o.id?.slice(0, 8)}`}
              subtitle={o.customer?.name ?? o.customerName ?? '\u2014'}
              meta={o.createdAt ? formatShortDate(o.createdAt) : undefined}
              onPress={() => onStatusAction(o.id, o.status)}
              right={
                <View className="items-end gap-1">
                  <Badge variant={orderStatusVariant(o.status)} dot>
                    {o.status ?? 'PENDING'}
                  </Badge>
                  {o.total != null ? (
                    <Text className="text-[13px] font-bold text-slate-900">
                      {formatCurrency(o.total)}
                    </Text>
                  ) : null}
                </View>
              }
            />
          ))
        ) : (
          <EmptyState
            icon={<ShoppingCart size={24} color="#94a3b8" />}
            title="No orders yet"
            description="Orders from your connected channels will show up here."
          />
        )}
      </Card>

      {/* Create Order Modal */}
      <BottomSheet visible={showCreate} onClose={() => setShowCreate(false)} title="New Order">
        <SelectField
          label="Customer"
          value={customerId}
          onChange={setCustomerId}
          placeholder="Select customer (optional)"
          options={customers.map((c) => ({ label: c.name, value: c.id }))}
        />
        <SelectField
          label="Channel"
          value={channelId}
          onChange={setChannelId}
          placeholder="Select channel (optional)"
          options={channels.map((c) => ({ label: c.name, value: c.id }))}
        />

        <Text className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-3 mt-2">
          Line Item
        </Text>
        <FormInput label="Product Name" value={itemName} onChangeText={setItemName} placeholder="e.g. Cotton T-Shirt" />
        <FormInput label="SKU" value={itemSku} onChangeText={setItemSku} placeholder="Optional" />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormInput label="Quantity" value={itemQty} onChangeText={setItemQty} keyboardType="numeric" placeholder="1" />
          </View>
          <View className="flex-1">
            <FormInput label="Unit Price" value={itemPrice} onChangeText={setItemPrice} keyboardType="decimal-pad" placeholder="0.00" />
          </View>
        </View>
        <FormInput label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional notes" multiline numberOfLines={2} />

        <Button onPress={onSubmit} loading={createMutation.isPending} className="mt-2">
          Create Order
        </Button>
      </BottomSheet>
    </PageShell>
  );
}
