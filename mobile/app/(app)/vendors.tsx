import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Truck } from 'lucide-react-native';
import { useState } from 'react';
import { Alert } from 'react-native';
import BottomSheet from '../../components/ui/BottomSheet';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import FormInput from '../../components/ui/FormInput';
import ListRow from '../../components/ui/ListRow';
import PageShell from '../../components/ui/PageShell';
import { vendorApi } from '../../lib/api';

export default function VendorsScreen() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [address, setAddress] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => (await vendorApi.list()).data,
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => vendorApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      setShowCreate(false);
      setName(''); setEmail(''); setPhone(''); setGstin(''); setPaymentTerms(''); setAddress('');
      Alert.alert('Success', 'Vendor created');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to create vendor');
    },
  });

  const onSubmit = () => {
    if (!name.trim()) { Alert.alert('Required', 'Vendor name is required'); return; }
    createMutation.mutate({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      gstin: gstin.trim() || undefined,
      paymentTerms: paymentTerms.trim() || undefined,
      address: address.trim() ? { line1: address.trim() } : undefined,
    });
  };

  const items: any[] = data?.items ?? data ?? [];

  return (
    <PageShell
      title="Vendors"
      subtitle={`${items.length} vendors`}
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
          items.map((v, idx) => (
            <ListRow
              key={v.id}
              isFirst={idx === 0}
              icon={<Truck size={15} color="#059669" />}
              title={v.name}
              subtitle={v.email ?? v.phone ?? ''}
              meta={[v.city, v.country].filter(Boolean).join(', ') || v.paymentTerms}
            />
          ))
        ) : (
          <EmptyState icon={<Truck size={24} color="#94a3b8" />} title="No vendors yet" description="Add a vendor to create purchase orders." />
        )}
      </Card>

      <BottomSheet visible={showCreate} onClose={() => setShowCreate(false)} title="New Vendor">
        <FormInput label="Vendor Name" value={name} onChangeText={setName} placeholder="Acme Supplies" />
        <FormInput label="Email" value={email} onChangeText={setEmail} placeholder="vendor@example.com" keyboardType="email-address" autoCapitalize="none" />
        <FormInput label="Phone" value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" />
        <FormInput label="GSTIN" value={gstin} onChangeText={setGstin} placeholder="Optional" autoCapitalize="characters" />
        <FormInput label="Payment Terms" value={paymentTerms} onChangeText={setPaymentTerms} placeholder="e.g. Net 30" />
        <FormInput label="Address" value={address} onChangeText={setAddress} placeholder="Full address" multiline />

        <Button onPress={onSubmit} loading={createMutation.isPending} className="mt-2">
          Create Vendor
        </Button>
      </BottomSheet>
    </PageShell>
  );
}
