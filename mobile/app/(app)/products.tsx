import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, Plus } from 'lucide-react-native';
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
import { productApi } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

export default function ProductsScreen() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [weight, setWeight] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await productApi.list()).data,
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => productApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowCreate(false);
      resetForm();
      Alert.alert('Success', 'Product created');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to create product');
    },
  });

  const resetForm = () => {
    setName(''); setSku(''); setBarcode(''); setDescription('');
    setCostPrice(''); setMrp(''); setSellingPrice(''); setWeight('');
  };

  const onSubmit = () => {
    if (!name.trim()) { Alert.alert('Required', 'Product name is required'); return; }
    if (!sku.trim()) { Alert.alert('Required', 'SKU is required'); return; }
    createMutation.mutate({
      name: name.trim(),
      sku: sku.trim(),
      barcode: barcode || undefined,
      description: description || undefined,
      weight: weight ? parseFloat(weight) : undefined,
      costPrice: costPrice ? parseFloat(costPrice) : undefined,
      mrp: mrp ? parseFloat(mrp) : undefined,
      sellingPrice: sellingPrice ? parseFloat(sellingPrice) : undefined,
    });
  };

  const items: any[] = data?.items ?? data ?? [];

  return (
    <PageShell
      title="Products"
      subtitle={`${items.length} SKUs`}
      action={
        <Button size="sm" leftIcon={<Plus size={12} color="#fff" />} onPress={() => setShowCreate(true)}>
          New
        </Button>
      }
      loading={isLoading}
      error={error}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      <Card className="overflow-hidden">
        {items.length > 0 ? (
          items.map((p, idx) => (
            <ListRow
              key={p.id}
              isFirst={idx === 0}
              icon={<Package size={15} color="#04AB94" />}
              title={p.name ?? p.title ?? 'Untitled'}
              subtitle={`SKU: ${p.sku ?? '\u2014'}`}
              meta={p.category?.name ?? p.brand?.name}
              right={
                p.price != null || p.sellingPrice != null ? (
                  <Badge variant="emerald">{formatCurrency(p.sellingPrice ?? p.price)}</Badge>
                ) : null
              }
            />
          ))
        ) : (
          <EmptyState
            icon={<Package size={24} color="#94a3b8" />}
            title="No products yet"
            description="Add your first product to start selling."
          />
        )}
      </Card>

      <BottomSheet visible={showCreate} onClose={() => setShowCreate(false)} title="New Product">
        <FormInput label="Product Name" value={name} onChangeText={setName} placeholder="e.g. Cotton T-Shirt" />
        <FormInput label="SKU" value={sku} onChangeText={setSku} placeholder="e.g. TSH-BLK-M" autoCapitalize="characters" />
        <FormInput label="Barcode" value={barcode} onChangeText={setBarcode} placeholder="Optional" />
        <FormInput label="Description" value={description} onChangeText={setDescription} placeholder="Optional" multiline numberOfLines={2} />
        <FormInput label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="0.00" />

        <Text className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-3 mt-2">
          Pricing
        </Text>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormInput label="Cost Price" value={costPrice} onChangeText={setCostPrice} keyboardType="decimal-pad" placeholder="0.00" />
          </View>
          <View className="flex-1">
            <FormInput label="MRP" value={mrp} onChangeText={setMrp} keyboardType="decimal-pad" placeholder="0.00" />
          </View>
        </View>
        <FormInput label="Selling Price" value={sellingPrice} onChangeText={setSellingPrice} keyboardType="decimal-pad" placeholder="0.00" />

        <Button onPress={onSubmit} loading={createMutation.isPending} className="mt-2">
          Create Product
        </Button>
      </BottomSheet>
    </PageShell>
  );
}
