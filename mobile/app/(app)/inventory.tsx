import { useQuery } from '@tanstack/react-query';
import { Boxes, Package } from 'lucide-react-native';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import ListRow from '../../components/ui/ListRow';
import PageShell from '../../components/ui/PageShell';
import { inventoryApi } from '../../lib/api';

export default function InventoryScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => (await inventoryApi.list()).data,
  });
  const items: any[] = data?.items ?? data ?? [];
  return (
    <PageShell
      title="Inventory"
      subtitle={`${items.length} stock records`}
      loading={isLoading}
      error={error}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      <Card className="overflow-hidden">
        {items.length > 0 ? (
          items.map((i, idx) => {
            const qty = i.quantity ?? 0;
            const low = i.reorderPoint != null && qty < i.reorderPoint;
            return (
              <ListRow
                key={i.id}
                isFirst={idx === 0}
                icon={<Package size={15} color="#059669" />}
                title={i.productName ?? i.product?.name ?? i.sku ?? 'SKU'}
                subtitle={i.warehouseName ?? i.warehouse?.name ?? ''}
                right={
                  <Badge variant={low ? 'rose' : 'emerald'} dot>
                    Qty {qty}
                  </Badge>
                }
              />
            );
          })
        ) : (
          <EmptyState icon={<Boxes size={24} color="#94a3b8" />} title="No stock records" />
        )}
      </Card>
    </PageShell>
  );
}
