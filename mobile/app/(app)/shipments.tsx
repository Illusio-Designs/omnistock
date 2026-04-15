import ScreenStub from '../../components/ScreenStub';
import { Text } from 'react-native';

export default function ShipmentsScreen() {
  return (
    <ScreenStub
      title="Shipments"
      description="Track outbound shipments across channels"
    >
      <Text className="text-slate-500">
        Shipment tracking will pull from channelApi.trackShipment once orders are
        linked. Not wired yet — parity port pending.
      </Text>
    </ScreenStub>
  );
}
