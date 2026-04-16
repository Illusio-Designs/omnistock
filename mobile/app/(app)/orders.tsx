import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Package, Plus, ShoppingCart } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
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
const RISK_FILTERS = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'NEEDS_APPROVAL'];

const riskVariant = (level?: string) => {
  if (level === 'HIGH') return 'rose' as const;
  if (level === 'MEDIUM') return 'amber' as const;
  if (level === 'LOW') return 'emerald' as const;
  return 'slate' as const;
};

export default function OrdersScreen() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
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
    queryKey: ['orders', filter, riskFilter],
    queryFn: async () => {
      const params: any = {};
      if (filter !== 'ALL') params.status = filter;
      if (riskFilter === 'NEEDS_APPROVAL') params.needsApproval = 'true';
      else if (riskFilter !== 'ALL') params.risk = riskFilter;
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
      if (err?.response?.status === 402) {
        const d = err.response.data || {};
        if (d.metric === 'orders') {
          Alert.alert(
            'Order limit reached',
            `You've reached your plan's monthly limit of ${d.limit} orders. Enable Pay-As-You-Go from Billing to continue, or upgrade your plan.`
          );
        } else {
          Alert.alert('Plan limit reached', d.error || 'Upgrade your plan to continue');
        }
      } else {
        Alert.alert('Error', err?.response?.data?.error || 'Failed to create order');
      }
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

  const autoRouteMutation = useMutation({
    mutationFn: (id: string) => orderApi.assignWarehouse(id, { auto: true }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      Alert.alert('Routed', `Assigned warehouse \u00B7 ${res.data?.reason || 'done'}`);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to auto-route');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => orderApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to approve');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      orderApi.reject(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to reject');
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

  const onOrderPress = (o: any) => {
    const { id, status, warehouseId, needsApproval, rtoScore, rtoRiskLevel, rtoFactors } = o;
    const riskSummary = rtoScore != null
      ? `RTO score: ${rtoScore}/100 (${rtoRiskLevel || 'N/A'})`
      : 'No RTO score yet';

    // High-risk flagged orders: approve / reject first
    if (needsApproval) {
      const topFactors = Array.isArray(rtoFactors)
        ? rtoFactors.slice(0, 3).map((f: any) => `\u2022 ${f.detail}`).join('\n')
        : '';
      Alert.alert(
        'Review Required',
        `${riskSummary}\n\n${topFactors}\n\nApprove to ship, or reject to cancel.`,
        [
          { text: 'Back', style: 'cancel' },
          {
            text: 'Reject (Cancel)',
            style: 'destructive',
            onPress: () => rejectMutation.mutate({ id, reason: 'High RTO risk' }),
          },
          { text: 'Approve & Ship', onPress: () => approveMutation.mutate(id) },
        ]
      );
      return;
    }

    const next = getNextStatus(status);
    const actions: any[] = [{ text: 'Close', style: 'cancel' }];
    if (!warehouseId && status !== 'DELIVERED' && status !== 'CANCELLED') {
      actions.push({ text: 'Auto-route warehouse', onPress: () => autoRouteMutation.mutate(id) });
    }
    if (next) {
      actions.push({ text: `Mark ${next}`, onPress: () => statusMutation.mutate({ id, status: next }) });
    }
    if (status !== 'DELIVERED' && status !== 'CANCELLED') {
      actions.push({
        text: 'Cancel Order',
        style: 'destructive' as const,
        onPress: () => statusMutation.mutate({ id, status: 'CANCELLED' }),
      });
    }
    Alert.alert('Order Actions', `Status: ${status}\n${riskSummary}`, actions);
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
              meta={
                o.warehouseId
                  ? `${o.createdAt ? formatShortDate(o.createdAt) + ' \u00B7 ' : ''}Routed`
                  : o.createdAt ? formatShortDate(o.createdAt) + ' \u00B7 Unrouted' : 'Unrouted'
              }
              onPress={() => onStatusAction(o.id, o.status, !!o.warehouseId)}
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
