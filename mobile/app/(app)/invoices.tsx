import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react-native';
import { Text, View } from 'react-native';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import ListRow from '../../components/ui/ListRow';
import PageShell from '../../components/ui/PageShell';
import StatusFilter from '../../components/ui/StatusFilter';
import { useState } from 'react';
import { billingApi } from '../../lib/api';
import { formatCurrency, formatShortDate } from '../../lib/utils';

const STATUSES = ['ALL', 'DRAFT', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'];

const invoiceStatusVariant = (s: string) => {
  if (s === 'PAID') return 'emerald' as const;
  if (s === 'OVERDUE' || s === 'CANCELLED') return 'rose' as const;
  if (s === 'UNPAID') return 'amber' as const;
  if (s === 'PARTIALLY_PAID') return 'sky' as const;
  return 'slate' as const;
};

export default function InvoicesScreen() {
  const [filter, setFilter] = useState('ALL');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['invoices', filter],
    queryFn: async () => {
      const params: any = {};
      if (filter !== 'ALL') params.status = filter;
      return (await billingApi.invoices()).data;
    },
  });

  const items: any[] = (data?.items ?? data ?? []).filter((inv: any) =>
    filter === 'ALL' ? true : inv.status === filter
  );

  return (
    <PageShell
      title="Invoices"
      subtitle={`${items.length} invoices`}
      loading={isLoading}
      error={error}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      <StatusFilter options={STATUSES} value={filter} onChange={setFilter} />

      <Card className="overflow-hidden">
        {items.length > 0 ? (
          items.map((inv, idx) => (
            <ListRow
              key={inv.id}
              isFirst={idx === 0}
              icon={<FileText size={15} color="#059669" />}
              title={`#${inv.number ?? inv.id?.slice(0, 8)}`}
              subtitle={inv.planName ?? inv.description ?? inv.type ?? ''}
              meta={inv.createdAt ? formatShortDate(inv.createdAt) : undefined}
              right={
                <View className="items-end gap-1">
                  <Badge variant={invoiceStatusVariant(inv.status)} dot>
                    {inv.status ?? 'DRAFT'}
                  </Badge>
                  {inv.total != null ? (
                    <Text className="text-[13px] font-bold text-slate-900">
                      {formatCurrency(inv.total)}
                    </Text>
                  ) : null}
                </View>
              }
            />
          ))
        ) : (
          <EmptyState icon={<FileText size={24} color="#94a3b8" />} title="No invoices yet" description="Invoices are generated when orders are fulfilled." />
        )}
      </Card>
    </PageShell>
  );
}
