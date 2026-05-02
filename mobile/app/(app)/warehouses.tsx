import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Warehouse } from 'lucide-react-native';
import { useState } from 'react';
import { Alert } from 'react-native';
import BottomSheet from '../../components/ui/BottomSheet';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import FormInput from '../../components/ui/FormInput';
import ListRow from '../../components/ui/ListRow';
import PageShell from '../../components/ui/PageShell';
import { warehouseApi } from '../../lib/api';

export default function WarehousesScreen() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await warehouseApi.list()).data,
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => warehouseApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] });
      setShowCreate(false);
      setName(''); setCode(''); setLine1(''); setCity(''); setState(''); setPincode('');
      Alert.alert('Success', 'Warehouse created');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to create warehouse');
    },
  });

  const onSubmit = () => {
    if (!name.trim()) { Alert.alert('Required', 'Warehouse name is required'); return; }
    if (!code.trim()) { Alert.alert('Required', 'Warehouse code is required'); return; }
    createMutation.mutate({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      address: {
        line1: line1.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        pincode: pincode.trim() || undefined,
        country: 'India',
      },
    });
  };

  const items: any[] = data?.items ?? data ?? [];

  return (
    <PageShell
      title="Warehouses"
      subtitle={`${items.length} locations`}
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
          items.map((w, idx) => (
            <ListRow
              key={w.id}
              isFirst={idx === 0}
              icon={<Warehouse size={15} color="#04AB94" />}
              title={w.name}
              subtitle={[w.address?.line1, w.address?.city].filter(Boolean).join(', ') || (w.address ?? w.city ?? '')}
              meta={w.code ? `Code: ${w.code}` : (w.country ?? '')}
            />
          ))
        ) : (
          <EmptyState icon={<Warehouse size={24} color="#94a3b8" />} title="No warehouses yet" description="Add your first fulfillment location." />
        )}
      </Card>

      <BottomSheet visible={showCreate} onClose={() => setShowCreate(false)} title="New Warehouse">
        <FormInput label="Name" value={name} onChangeText={setName} placeholder="Main Warehouse" />
        <FormInput label="Code" value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="e.g. WH-01" autoCapitalize="characters" />
        <FormInput label="Address" value={line1} onChangeText={setLine1} placeholder="Street address" />
        <FormInput label="City" value={city} onChangeText={setCity} placeholder="City" />
        <FormInput label="State" value={state} onChangeText={setState} placeholder="State" />
        <FormInput label="Pincode" value={pincode} onChangeText={setPincode} placeholder="PIN code" keyboardType="numeric" />

        <Button onPress={onSubmit} loading={createMutation.isPending} className="mt-2">
          Create Warehouse
        </Button>
      </BottomSheet>
    </PageShell>
  );
}
