import { ActivityIndicator, Text, View } from 'react-native';
import { Wrench } from 'lucide-react-native';

interface Props {
  message: string;
  eta: string;
}

export default function MaintenanceScreen({ message, eta }: Props) {
  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <View className="w-20 h-20 rounded-3xl bg-emerald-500 items-center justify-center mb-6 shadow-lg">
        <Wrench size={36} color="white" />
      </View>

      <Text className="text-2xl font-bold text-slate-900 text-center">
        Under Maintenance
      </Text>

      <Text className="mt-3 text-sm text-slate-600 text-center leading-5">
        {message}
      </Text>

      {eta ? (
        <View className="mt-5 flex-row items-center bg-emerald-50 border border-emerald-200 rounded-full px-4 py-2">
          <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
          <Text className="text-xs font-bold text-emerald-700">
            Estimated time: {eta}
          </Text>
        </View>
      ) : null}

      <ActivityIndicator size="small" color="#06D4B8" style={{ marginTop: 24 }} />

      <Text className="mt-8 text-[10px] text-slate-400 text-center">
        We are working to get things back up. Please try again shortly.
      </Text>
    </View>
  );
}
