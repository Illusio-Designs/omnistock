import { Link, router } from 'expo-router';
import Constants from 'expo-constants';
import {
  Boxes,
  ChevronRight,
  CreditCard,
  FileText,
  Info,
  LogOut,
  Plug,
  Settings as SettingsIcon,
  Shield,
  Truck,
  User,
  Warehouse,
} from 'lucide-react-native';
import { Alert, Pressable, Text, View } from 'react-native';
import Card from '../../components/ui/Card';
import PageShell from '../../components/ui/PageShell';
import { useAuthStore } from '../../store/auth.store';

type Item = {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
};

const ITEMS: Item[] = [
  { href: '/inventory', label: 'Inventory', icon: <Boxes size={16} color="#059669" /> },
  { href: '/purchases', label: 'Purchases', icon: <FileText size={16} color="#059669" /> },
  { href: '/vendors', label: 'Vendors', icon: <Truck size={16} color="#059669" /> },
  { href: '/warehouses', label: 'Warehouses', icon: <Warehouse size={16} color="#059669" /> },
  { href: '/customers', label: 'Customers', icon: <User size={16} color="#059669" /> },
  { href: '/channels', label: 'Channels', icon: <Plug size={16} color="#059669" /> },
  { href: '/shipments', label: 'Shipments', icon: <Truck size={16} color="#059669" /> },
  { href: '/invoices', label: 'Invoices', icon: <CreditCard size={16} color="#059669" /> },
  { href: '/settings', label: 'Settings', icon: <SettingsIcon size={16} color="#059669" /> },
  {
    href: '/admin',
    label: 'Platform Admin',
    icon: <Shield size={16} color="#059669" />,
    adminOnly: true,
  },
];

const APP_VERSION = Constants.expoConfig?.version || '0.1.0';

export default function MoreScreen() {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const logout = useAuthStore((s) => s.logout);
  const isPlatformAdmin = useAuthStore((s) => s.isPlatformAdmin());

  const onLogout = () => {
    Alert.alert('Sign out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <PageShell title="More" subtitle="Account and navigation">
      {/* User card */}
      <Card className="p-5 mb-4">
        <View className="flex-row items-center">
          <View className="w-12 h-12 rounded-full bg-emerald-500 items-center justify-center mr-3">
            <Text className="text-white font-bold">{initials}</Text>
          </View>
          <View className="flex-1">
            <Text className="font-bold text-slate-900">{user?.name ?? 'User'}</Text>
            <Text className="text-xs text-slate-500" numberOfLines={1}>
              {user?.email}
            </Text>
            {tenant ? (
              <Text className="text-[10px] text-slate-400 mt-0.5" numberOfLines={1}>
                {tenant.businessName}
              </Text>
            ) : null}
          </View>
          <View className="bg-emerald-50 rounded-lg px-2 py-1">
            <Text className="text-[10px] font-bold text-emerald-700">
              {user?.role?.replace('_', ' ')}
            </Text>
          </View>
        </View>
      </Card>

      {/* Navigation menu */}
      <Card className="overflow-hidden mb-4">
        {ITEMS.filter((i) => !i.adminOnly || isPlatformAdmin).map((item, idx, arr) => (
          <Link key={item.href} href={item.href as any} asChild>
            <Pressable
              className={`flex-row items-center px-5 py-4 active:bg-slate-50 ${
                idx < arr.length - 1 ? 'border-b border-slate-100' : ''
              }`}
            >
              <View className="w-8 h-8 rounded-lg bg-emerald-50 items-center justify-center mr-3">
                {item.icon}
              </View>
              <Text className="flex-1 text-sm font-bold text-slate-900">{item.label}</Text>
              <ChevronRight size={16} color="#94a3b8" />
            </Pressable>
          </Link>
        ))}
      </Card>

      {/* Sign out */}
      <Pressable
        onPress={onLogout}
        className="flex-row items-center justify-center bg-white border border-rose-200 rounded-2xl py-3 active:opacity-80 mb-4"
      >
        <LogOut size={16} color="#e11d48" />
        <Text className="text-rose-600 font-bold ml-2 text-sm">Sign out</Text>
      </Pressable>

      {/* App info */}
      <View className="items-center py-4">
        <View className="flex-row items-center mb-1">
          <Info size={12} color="#94a3b8" />
          <Text className="text-[11px] text-slate-400 ml-1">OmniStock v{APP_VERSION}</Text>
        </View>
        <Text className="text-[10px] text-slate-300">
          Multi-channel Commerce Platform
        </Text>
      </View>
    </PageShell>
  );
}
