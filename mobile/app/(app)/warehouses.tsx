import { useQuery } from '@tanstack/react-query';
import { Plus, Warehouse } from 'lucide-react-native';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import ListRow from '../../components/ui/ListRow';
import PageShell from '../../components/ui/PageShell';
import { warehouseApi } from '../../lib/api';

export default function WarehousesScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await warehouseApi.list()).data,
  });
  const items: any[] = data?.items ?? data ?? [];
  return (
    <PageShell
      title="Warehouses"
      subtitle={`${items.length} locations`}
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
          items.map((w, idx) => (
            <ListRow
              key={w.id}
              isFirst={idx === 0}
              icon={<Warehouse size={15} color="#059669" />}
              title={w.name}
              subtitle={w.address ?? w.city ?? ''}
              meta={w.country}
            />
          ))
        ) : (
          <EmptyState icon={<Warehouse size={24} color="#94a3b8" />} title="No warehouses yet" />
        )}
      </Card>
    </PageShell>
  );
}
