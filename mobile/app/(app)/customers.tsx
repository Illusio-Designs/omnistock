import { useQuery } from '@tanstack/react-query';
import { Plus, User } from 'lucide-react-native';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import ListRow from '../../components/ui/ListRow';
import PageShell from '../../components/ui/PageShell';
import { customerApi } from '../../lib/api';

export default function CustomersScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await customerApi.list()).data,
  });
  const items: any[] = data?.items ?? data ?? [];
  return (
    <PageShell
      title="Customers"
      subtitle={`${items.length} customers`}
      action={
        <Button size="sm" leftIcon={<Plus size={12} color="#fff" />}>
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
              icon={<User size={15} color="#059669" />}
              title={c.name}
              subtitle={c.email ?? c.phone ?? ''}
              meta={c.city ?? c.country}
            />
          ))
        ) : (
          <EmptyState icon={<User size={24} color="#94a3b8" />} title="No customers yet" />
        )}
      </Card>
    </PageShell>
  );
}
