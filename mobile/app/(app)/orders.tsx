import { useQuery } from '@tanstack/react-query';
import { Package, Plus, ShoppingCart } from 'lucide-react-native';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import ListRow from '../../components/ui/ListRow';
import PageShell from '../../components/ui/PageShell';
import { orderApi } from '../../lib/api';
import { orderStatusVariant } from '../../lib/statusColors';
import { formatCurrency, formatShortDate } from '../../lib/utils';

export default function OrdersScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => (await orderApi.list()).data,
  });

  const items: any[] = data?.items ?? data ?? [];

  return (
    <PageShell
      title="Orders"
      subtitle={`${items.length} total orders`}
      action={
        <Button size="sm" leftIcon={<Plus size={12} color="#fff" />}>
          New Order
        </Button>
      }
      loading={isLoading}
      error={error}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      <Card className="overflow-hidden">
        {items.length > 0 ? (
          items.map((o, idx) => (
            <ListRow
              key={o.id}
              isFirst={idx === 0}
              icon={<Package size={15} color="#059669" />}
              title={`#${o.orderNumber ?? o.id?.slice(0, 8)}`}
              subtitle={o.customer?.name ?? o.customerName ?? '—'}
              meta={o.createdAt ? formatShortDate(o.createdAt) : undefined}
              right={
                <>
                  <Badge variant={orderStatusVariant(o.status)} dot>
                    {o.status ?? 'PENDING'}
                  </Badge>
                  {o.total != null ? (
                    <Badge variant="slate">{formatCurrency(o.total)}</Badge>
                  ) : null}
                </>
              }
            />
          ))
        ) : (
          <EmptyState
            icon={<ShoppingCart size={24} color="#94a3b8" />}
            title="No orders yet"
            description="Orders from your connected channels will show up here."
          />
        )}
      </Card>
    </PageShell>
  );
}
