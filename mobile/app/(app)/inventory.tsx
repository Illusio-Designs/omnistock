import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, Package } from 'lucide-react-native';
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
import { inventoryApi, warehouseApi } from '../../lib/api';

const MOVE_TYPES = [
  { label: 'Inbound (Add Stock)', value: 'INBOUND' },
  { label: 'Outbound (Remove Stock)', value: 'OUTBOUND' },
  { label: 'Adjustment', value: 'ADJUSTMENT' },
];

export default function InventoryScreen() {
  const qc = useQueryClient();
  const [showAdjust, setShowAdjust] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [moveType, setMoveType] = useState('INBOUND');
  const [quantity, setQuantity] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => (await inventoryApi.list()).data,
  });

  const { data: whData } = useQuery({
    queryKey: ['warehouses-select'],
    queryFn: async () => (await warehouseApi.list()).data,
    enabled: showAdjust,
  });

  const adjustMutation = useMutation({
    mutationFn: (body: any) => inventoryApi.adjust(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowAdjust(false);
      setWarehouseId(''); setVariantId(''); setMoveType('INBOUND'); setQuantity(''); setAdjustNotes('');
      Alert.alert('Success', 'Stock adjusted');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to adjust stock');
    },
  });

  const onSubmit = () => {
    if (!warehouseId) { Alert.alert('Required', 'Select a warehouse'); return; }
    if (!variantId.trim()) { Alert.alert('Required', 'Variant ID is required'); return; }
    if (!quantity || parseInt(quantity) <= 0) { Alert.alert('Required', 'Enter a valid quantity'); return; }
    adjustMutation.mutate({
      warehouseId,
      variantId: variantId.trim(),
      type: moveType,
      quantity: parseInt(quantity),
      notes: adjustNotes || undefined,
    });
  };

  const items: any[] = data?.items ?? data ?? [];
  const warehouses: any[] = whData?.items ?? whData ?? [];

  return (
    <PageShell
      title="Inventory"
      subtitle={`${items.length} stock records`}
      action={
        <Button size="sm" onPress={() => setShowAdjust(true)}>
          Adjust
        </Button>
      }
      loading={isLoading}
      error={error}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      <Card className="overflow-hidden">
        {items.length > 0 ? (
          items.map((i, idx) => {
            const qty = i.quantityAvailable ?? i.quantity ?? 0;
            const low = i.reorderPoint != null && qty <= i.reorderPoint;
            return (
              <ListRow
                key={i.id}
                isFirst={idx === 0}
                icon={<Package size={15} color="#059669" />}
                title={i.productName ?? i.product?.name ?? i.sku ?? 'SKU'}
                subtitle={i.warehouseName ?? i.warehouse?.name ?? ''}
                right={
                  <View className="items-end gap-1">
                    <Badge variant={low ? 'rose' : 'emerald'} dot>
                      {qty} available
                    </Badge>
                    {i.reorderPoint != null ? (
                      <Text className="text-[11px] text-slate-400 font-medium">
                        Reorder at {i.reorderPoint}
                      </Text>
                    ) : null}
                  </View>
                }
              />
            );
          })
        ) : (
          <EmptyState icon={<Boxes size={24} color="#94a3b8" />} title="No stock records" description="Add inventory by adjusting stock." />
        )}
      </Card>

      <BottomSheet visible={showAdjust} onClose={() => setShowAdjust(false)} title="Adjust Stock">
        <SelectField
          label="Warehouse"
          value={warehouseId}
          onChange={setWarehouseId}
          placeholder="Select warehouse"
          options={warehouses.map((w) => ({ label: w.name, value: w.id }))}
        />
        <FormInput label="Variant ID" value={variantId} onChangeText={setVariantId} placeholder="Product variant UUID" />
        <SelectField
          label="Movement Type"
          value={moveType}
          onChange={setMoveType}
          options={MOVE_TYPES}
        />
        <FormInput label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="Enter quantity" />
        <FormInput label="Notes" value={adjustNotes} onChangeText={setAdjustNotes} placeholder="Reason for adjustment" multiline />

        <Button onPress={onSubmit} loading={adjustMutation.isPending} className="mt-2">
          Adjust Stock
        </Button>
      </BottomSheet>
    </PageShell>
  );
}
