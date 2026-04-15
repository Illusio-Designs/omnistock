import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react-native';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import ListRow from '../../components/ui/ListRow';
import PageShell from '../../components/ui/PageShell';
import { billingApi } from '../../lib/api';
import { orderStatusVariant } from '../../lib/statusColors';
import { formatCurrency, formatShortDate } from '../../lib/utils';

export default function InvoicesScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => (await billingApi.invoices()).data,
  });
  const items: any[] = data?.items ?? data ?? [];
  return (
    <PageShell
      title="Invoices"
      subtitle={`${items.length} billing invoices`}
      loading={isLoading}
      error={error}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      <Card className="overflow-hidden">
        {items.length > 0 ? (
          items.map((inv, idx) => (
            <ListRow
              key={inv.id}
              isFirst={idx === 0}
              icon={<FileText size={15} color="#059669" />}
              title={`#${inv.number ?? inv.id?.slice(0, 8)}`}
              subtitle={inv.planName ?? inv.description ?? ''}
              meta={inv.createdAt ? formatShortDate(inv.createdAt) : undefined}
              right={
                <>
                  <Badge variant={orderStatusVariant(inv.status)} dot>
                    {inv.status ?? 'PENDING'}
                  </Badge>
                  {inv.total != null ? (
                    <Badge variant="slate">{formatCurrency(inv.total)}</Badge>
                  ) : null}
                </>
              }
            />
          ))
        ) : (
          <EmptyState icon={<FileText size={24} color="#94a3b8" />} title="No invoices yet" />
        )}
      </Card>
    </PageShell>
  );
}
