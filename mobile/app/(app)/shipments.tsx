import { Truck } from 'lucide-react-native';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import PageShell from '../../components/ui/PageShell';

export default function ShipmentsScreen() {
  return (
    <PageShell title="Shipments" subtitle="Track outbound shipments across channels">
      <Card className="overflow-hidden">
        <EmptyState
          icon={<Truck size={24} color="#94a3b8" />}
          title="No shipments yet"
          description="Shipments will appear here once orders are fulfilled via a shipping channel."
        />
      </Card>
    </PageShell>
  );
}
