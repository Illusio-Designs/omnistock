import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, User } from 'lucide-react-native';
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
import Avatar from '../../components/ui/Avatar';
import { customerApi } from '../../lib/api';
import { toast } from '../../store/toast.store';

export default function CustomersScreen() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [isB2B, setIsB2B] = useState(false);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await customerApi.list()).data,
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => customerApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowCreate(false);
      setName(''); setEmail(''); setPhone(''); setGstin(''); setIsB2B(false);
      toast.success('Customer created');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to create customer');
    },
  });

  const onSubmit = () => {
    if (!name.trim()) { toast.warning('Customer name is required'); return; }
    createMutation.mutate({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      gstIn: gstin.trim().toUpperCase() || undefined,
      isB2B,
    });
  };

  const items: any[] = data?.customers ?? data ?? [];

  return (
    <PageShell
      title="Customers"
      subtitle={`${items.length} customers`}
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
          items.map((c, idx) => (
            <ListRow
              key={c.id}
              isFirst={idx === 0}
              icon={<Avatar name={c.name} size="sm" />}
              title={c.name}
              subtitle={c.email ?? c.phone ?? ''}
              meta={c.city ?? c.country}
              right={
                c.isB2B ? <Badge variant="violet">B2B</Badge> : null
              }
            />
          ))
        ) : (
          <EmptyState icon={<User size={24} color="#94a3b8" />} title="No customers yet" description="Add your first customer." />
        )}
      </Card>

      <BottomSheet visible={showCreate} onClose={() => setShowCreate(false)} title="New Customer">
        <FormInput label="Full Name" value={name} onChangeText={setName} placeholder="John Doe" />
        <FormInput label="Email" value={email} onChangeText={setEmail} placeholder="john@example.com" keyboardType="email-address" autoCapitalize="none" />
        <FormInput label="Phone" value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" />
        <FormInput label="GSTIN" value={gstin} onChangeText={(v) => setGstin(v.toUpperCase())} placeholder="Optional" autoCapitalize="characters" />

        {/* B2B toggle */}
        <Pressable
          onPress={() => setIsB2B(!isB2B)}
          className="flex-row items-center py-3 mb-4"
        >
          <View className={`w-6 h-6 rounded-lg border-2 items-center justify-center mr-3 ${
            isB2B ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'
          }`}>
            {isB2B ? <Text className="text-white text-xs font-bold">✓</Text> : null}
          </View>
          <Text className="text-[15px] font-medium text-slate-700">B2B / Wholesale customer</Text>
        </Pressable>

        <Button onPress={onSubmit} loading={createMutation.isPending} className="mt-2">
          Create Customer
        </Button>
      </BottomSheet>
    </PageShell>
  );
}
