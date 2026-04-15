import { Building2, CreditCard, Shield, User } from 'lucide-react-native';
import { Text, View } from 'react-native';
import Card from '../../components/ui/Card';
import PageShell from '../../components/ui/PageShell';
import { useAuthStore } from '../../store/auth.store';

type Row = { label: string; value: string };
type Section = { title: string; icon: React.ReactNode; rows: Row[] };

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const plan = useAuthStore((s) => s.plan);
  const subscription = useAuthStore((s) => s.subscription);

  const sections: Section[] = [
    {
      title: 'Account',
      icon: <User size={15} color="#059669" />,
      rows: [
        { label: 'Name', value: user?.name ?? '—' },
        { label: 'Email', value: user?.email ?? '—' },
        { label: 'Role', value: user?.role ?? '—' },
      ],
    },
    {
      title: 'Workspace',
      icon: <Building2 size={15} color="#059669" />,
      rows: [
        { label: 'Tenant', value: tenant?.businessName ?? '—' },
        { label: 'Slug', value: tenant?.slug ?? '—' },
        { label: 'Status', value: tenant?.status ?? '—' },
      ],
    },
    {
      title: 'Subscription',
      icon: <CreditCard size={15} color="#059669" />,
      rows: [
        { label: 'Plan', value: plan?.name ?? '—' },
        { label: 'Status', value: subscription?.status ?? '—' },
        { label: 'PAYG', value: subscription?.payAsYouGo ? 'On' : 'Off' },
      ],
    },
    {
      title: 'Security',
      icon: <Shield size={15} color="#059669" />,
      rows: [
        { label: 'Platform admin', value: user?.isPlatformAdmin ? 'Yes' : 'No' },
      ],
    },
  ];

  return (
    <PageShell title="Settings" subtitle="Account and workspace">
      {sections.map((sec) => (
        <Card key={sec.title} className="p-5 mb-4">
          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 rounded-lg bg-emerald-50 items-center justify-center mr-2">
              {sec.icon}
            </View>
            <Text className="font-bold text-slate-900">{sec.title}</Text>
          </View>
          {sec.rows.map((r, idx) => (
            <View
              key={r.label}
              className={`flex-row justify-between py-3 ${
                idx > 0 ? 'border-t border-slate-100' : ''
              }`}
            >
              <Text className="text-sm text-slate-500">{r.label}</Text>
              <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                {r.value}
              </Text>
            </View>
          ))}
        </Card>
      ))}
    </PageShell>
  );
}
