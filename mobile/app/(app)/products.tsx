import { useQuery } from '@tanstack/react-query';
import { Package, Plus } from 'lucide-react-native';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import ListRow from '../../components/ui/ListRow';
import PageShell from '../../components/ui/PageShell';
import { productApi } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

export default function ProductsScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await productApi.list()).data,
  });

  const items: any[] = data?.items ?? data ?? [];

  return (
    <PageShell
      title="Products"
      subtitle={`${items.length} SKUs`}
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
          items.map((p, idx) => (
            <ListRow
              key={p.id}
              isFirst={idx === 0}
              icon={<Package size={15} color="#059669" />}
              title={p.name ?? p.title ?? 'Untitled'}
              subtitle={`SKU: ${p.sku ?? '—'}`}
              meta={p.category?.name ?? p.brand?.name}
              right={
                p.price != null ? (
                  <Badge variant="emerald">{formatCurrency(p.price)}</Badge>
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
    </PageShell>
  );
}
