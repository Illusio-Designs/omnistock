import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus } from 'lucide-react-native';
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
import SelectField from '../../components/ui/SelectField';
import StatusFilter from '../../components/ui/StatusFilter';
import { purchaseApi, vendorApi } from '../../lib/api';
import { orderStatusVariant } from '../../lib/statusColors';
import { formatCurrency, formatShortDate } from '../../lib/utils';

const STATUSES = ['ALL', 'DRAFT', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'];

export default function PurchasesScreen() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [vendorId, setVendorId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [itemVariant, setItemVariant] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemCost, setItemCost] = useState('');
  const [poNotes, setPoNotes] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['purchases', filter],
    queryFn: async () => {
      const params: any = {};
      if (filter !== 'ALL') params.status = filter;
      return (await purchaseApi.list(params)).data;
    },
  });

  const { data: vendorsData } = useQuery({
    queryKey: ['vendors-select'],
    queryFn: async () => (await vendorApi.list()).data,
    enabled: showCreate,
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => purchaseApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      setShowCreate(false);
      setVendorId(''); setExpectedDate(''); setItemVariant(''); setItemQty('1'); setItemCost(''); setPoNotes('');
      Alert.alert('Success', 'Purchase order created');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to create PO');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      purchaseApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchases'] }),
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to update');
    },
  });

  const onSubmit = () => {
    if (!vendorId) { Alert.alert('Required', 'Select a vendor'); return; }
    if (!itemVariant.trim() || !itemCost) { Alert.alert('Required', 'Variant ID and unit cost are required'); return; }
    createMutation.mutate({
      vendorId,
      expectedDate: expectedDate || undefined,
      notes: poNotes || undefined,
      items: [{ variantId: itemVariant.trim(), orderedQty: parseInt(itemQty) || 1, unitCost: parseFloat(itemCost) }],
    });
  };

  const getNextPOStatus = (s: string) => {
    const flow: Record<string, string[]> = {
      DRAFT: ['SENT', 'CANCELLED'],
      SENT: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
      PARTIALLY_RECEIVED: ['RECEIVED'],
    };
    return flow[s] || [];
  };

  const onPOAction = (id: string, current: string) => {
    const options = getNextPOStatus(current);
    if (!options.length) return;
    Alert.alert(
      'Update Status',
      `Current: ${current}`,
      [
        { text: 'Cancel', style: 'cancel' },
        ...options.map((s) => ({
          text: s.replace('_', ' '),
          style: (s === 'CANCELLED' ? 'destructive' : 'default') as any,
          onPress: () => statusMutation.mutate({ id, status: s }),
        })),
      ]
    );
  };

  const items: any[] = data?.items ?? data ?? [];
  const vendors: any[] = vendorsData?.items ?? vendorsData ?? [];

  return (
    <PageShell
      title="Purchases"
      subtitle={`${items.length} purchase orders`}
      action={
        <Button size="sm" leftIcon={<Plus size={12} color="#fff" />} onPress={() => setShowCreate(true)}>
          New PO
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
          items.map((p, idx) => (
            <ListRow
              key={p.id}
              isFirst={idx === 0}
              icon={<FileText size={15} color="#059669" />}
              title={`#${p.poNumber ?? p.id?.slice(0, 8)}`}
              subtitle={p.vendor?.name ?? p.vendorName ?? '\u2014'}
              meta={p.createdAt ? formatShortDate(p.createdAt) : undefined}
              onPress={() => onPOAction(p.id, p.status)}
              right={
                <View className="items-end gap-1">
                  <Badge variant={orderStatusVariant(p.status)} dot>
                    {p.status ?? 'DRAFT'}
                  </Badge>
                  {p.total != null ? (
                    <Text className="text-[13px] font-bold text-slate-900">{formatCurrency(p.total)}</Text>
                  ) : null}
                </View>
              }
            />
          ))
        ) : (
          <EmptyState icon={<FileText size={24} color="#94a3b8" />} title="No purchase orders" description="Create a PO to order stock from vendors." />
        )}
      </Card>

      <BottomSheet visible={showCreate} onClose={() => setShowCreate(false)} title="New Purchase Order">
        <SelectField
          label="Vendor"
          value={vendorId}
          onChange={setVendorId}
          placeholder="Select vendor"
          options={vendors.map((v) => ({ label: v.name, value: v.id }))}
        />
        <FormInput label="Expected Date" value={expectedDate} onChangeText={setExpectedDate} placeholder="YYYY-MM-DD" />

        <Text className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-3 mt-2">
          Line Item
        </Text>
        <FormInput label="Variant ID" value={itemVariant} onChangeText={setItemVariant} placeholder="Product variant UUID" />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormInput label="Quantity" value={itemQty} onChangeText={setItemQty} keyboardType="numeric" placeholder="1" />
          </View>
          <View className="flex-1">
            <FormInput label="Unit Cost" value={itemCost} onChangeText={setItemCost} keyboardType="decimal-pad" placeholder="0.00" />
          </View>
        </View>
        <FormInput label="Notes" value={poNotes} onChangeText={setPoNotes} placeholder="Delivery instructions, terms..." multiline />

        <Button onPress={onSubmit} loading={createMutation.isPending} className="mt-2">
          Create PO
        </Button>
      </BottomSheet>
    </PageShell>
  );
}
