import { Text, View } from 'react-native';
import ScreenStub from '../../components/ScreenStub';
import { useAuthStore } from '../../store/auth.store';

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const plan = useAuthStore((s) => s.plan);
  const subscription = useAuthStore((s) => s.subscription);

  const rows: { label: string; value: string }[] = [
    { label: 'Name', value: user?.name ?? '—' },
    { label: 'Email', value: user?.email ?? '—' },
    { label: 'Role', value: user?.role ?? '—' },
    { label: 'Tenant', value: tenant?.businessName ?? '—' },
    { label: 'Plan', value: plan?.name ?? '—' },
    { label: 'Subscription', value: subscription?.status ?? '—' },
  ];

  return (
    <ScreenStub title="Settings" description="Account and workspace">
      <View className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {rows.map((r, idx) => (
          <View
            key={r.label}
            className={`flex-row justify-between px-4 py-3 ${
              idx < rows.length - 1 ? 'border-b border-slate-100' : ''
            }`}
          >
            <Text className="text-slate-500">{r.label}</Text>
            <Text className="text-slate-900 font-medium">{r.value}</Text>
          </View>
        ))}
      </View>
    </ScreenStub>
  );
}
