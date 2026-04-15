import { useQuery } from '@tanstack/react-query';
import { Plus, Truck } from 'lucide-react-native';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import ListRow from '../../components/ui/ListRow';
import PageShell from '../../components/ui/PageShell';
import { vendorApi } from '../../lib/api';

export default function VendorsScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => (await vendorApi.list()).data,
  });
  const items: any[] = data?.items ?? data ?? [];
  return (
    <PageShell
      title="Vendors"
      subtitle={`${items.length} vendors`}
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
          items.map((v, idx) => (
            <ListRow
              key={v.id}
              isFirst={idx === 0}
              icon={<Truck size={15} color="#059669" />}
              title={v.name}
              subtitle={v.email ?? v.phone ?? ''}
              meta={v.city ?? v.country}
            />
          ))
        ) : (
          <EmptyState icon={<Truck size={24} color="#94a3b8" />} title="No vendors yet" />
        )}
      </Card>
    </PageShell>
  );
}
