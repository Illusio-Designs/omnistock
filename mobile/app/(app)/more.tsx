import { Link, router } from 'expo-router';
import { ChevronRight, LogOut } from 'lucide-react-native';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth.store';

type Item = { href: string; label: string; adminOnly?: boolean };

const ITEMS: Item[] = [
  { href: '/inventory', label: 'Inventory' },
  { href: '/purchases', label: 'Purchases' },
  { href: '/vendors', label: 'Vendors' },
  { href: '/warehouses', label: 'Warehouses' },
  { href: '/customers', label: 'Customers' },
  { href: '/channels', label: 'Channels' },
  { href: '/shipments', label: 'Shipments' },
  { href: '/invoices', label: 'Invoices' },
  { href: '/settings', label: 'Settings' },
  { href: '/admin', label: 'Platform Admin', adminOnly: true },
];

export default function MoreScreen() {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const logout = useAuthStore((s) => s.logout);
  const isPlatformAdmin = useAuthStore((s) => s.isPlatformAdmin)();

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

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="bg-white rounded-xl p-4 border border-slate-200 mb-4">
          <Text className="text-slate-900 font-semibold">{user?.name ?? 'User'}</Text>
          <Text className="text-slate-500 text-sm">{user?.email}</Text>
          {tenant ? (
            <Text className="text-slate-400 text-xs mt-1">{tenant.businessName}</Text>
          ) : null}
        </View>

        <View className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
          {ITEMS.filter((i) => !i.adminOnly || isPlatformAdmin).map((item, idx, arr) => (
            <Link key={item.href} href={item.href as any} asChild>
              <Pressable
                className={`flex-row items-center justify-between px-4 py-4 ${
                  idx < arr.length - 1 ? 'border-b border-slate-100' : ''
                }`}
              >
                <Text className="text-slate-900">{item.label}</Text>
                <ChevronRight size={18} color="#94a3b8" />
              </Pressable>
            </Link>
          ))}
        </View>

        <Pressable
          onPress={onLogout}
          className="flex-row items-center justify-center bg-white border border-red-200 rounded-xl py-3 active:opacity-80"
        >
          <LogOut size={18} color="#dc2626" />
          <Text className="text-red-600 font-semibold ml-2">Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
