import { useQuery } from '@tanstack/react-query';
import { Truck } from 'lucide-react-native';
import { Text, View } from 'react-native';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import ListRow from '../../components/ui/ListRow';
import PageShell from '../../components/ui/PageShell';
import StatusFilter from '../../components/ui/StatusFilter';
import { useState } from 'react';
import { formatShortDate } from '../../lib/utils';

// Shipments are read from order fulfillment data — no dedicated API yet.
// We show a placeholder that works once the backend ships shipment tracking.
const STATUSES = ['ALL', 'PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'];

const shipmentStatusVariant = (s: string) => {
  if (s === 'DELIVERED') return 'emerald' as const;
  if (s === 'FAILED' || s === 'RETURNED') return 'rose' as const;
  if (s === 'IN_TRANSIT' || s === 'OUT_FOR_DELIVERY') return 'amber' as const;
  return 'slate' as const;
};

export default function ShipmentsScreen() {
  const [filter, setFilter] = useState('ALL');

  // Once a shipments API exists, replace this with a real query
  const items: any[] = [];

  return (
    <PageShell title="Shipments" subtitle="Track outbound shipments">
      <StatusFilter options={STATUSES} value={filter} onChange={setFilter} />
      <Card className="overflow-hidden">
        {items.length > 0 ? (
          items.map((s, idx) => (
            <ListRow
              key={s.id}
              isFirst={idx === 0}
              icon={<Truck size={15} color="#04AB94" />}
              title={`AWB: ${s.awb ?? s.trackingNumber ?? '\u2014'}`}
              subtitle={s.courier ?? s.carrierName ?? ''}
              meta={s.createdAt ? formatShortDate(s.createdAt) : undefined}
              right={
                <Badge variant={shipmentStatusVariant(s.status)} dot>
                  {s.status}
                </Badge>
              }
            />
          ))
        ) : (
          <EmptyState
            icon={<Truck size={24} color="#94a3b8" />}
            title="No shipments yet"
            description="Shipments will appear here once orders are fulfilled."
          />
        )}
      </Card>
    </PageShell>
  );
}
