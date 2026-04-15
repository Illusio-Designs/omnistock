import { useQuery } from '@tanstack/react-query';
import { FileText, Plus } from 'lucide-react-native';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import ListRow from '../../components/ui/ListRow';
import PageShell from '../../components/ui/PageShell';
import { purchaseApi } from '../../lib/api';
import { orderStatusVariant } from '../../lib/statusColors';
import { formatCurrency, formatShortDate } from '../../lib/utils';

export default function PurchasesScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['purchases'],
    queryFn: async () => (await purchaseApi.list()).data,
  });
  const items: any[] = data?.items ?? data ?? [];
  return (
    <PageShell
      title="Purchases"
      subtitle={`${items.length} purchase orders`}
      action={
        <Button size="sm" leftIcon={<Plus size={12} color="#fff" />}>
          New PO
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
              icon={<FileText size={15} color="#059669" />}
              title={`#${p.poNumber ?? p.id?.slice(0, 8)}`}
              subtitle={p.vendor?.name ?? p.vendorName ?? '—'}
              meta={p.createdAt ? formatShortDate(p.createdAt) : undefined}
              right={
                <>
                  <Badge variant={orderStatusVariant(p.status)} dot>
                    {p.status ?? 'PENDING'}
                  </Badge>
                  {p.total != null ? (
                    <Badge variant="slate">{formatCurrency(p.total)}</Badge>
                  ) : null}
                </>
              }
            />
          ))
        ) : (
          <EmptyState icon={<FileText size={24} color="#94a3b8" />} title="No purchase orders" />
        )}
      </Card>
    </PageShell>
  );
}
