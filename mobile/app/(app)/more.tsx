import { Link, router } from 'expo-router';
import Constants from 'expo-constants';
import {
  Activity,
  Bell,
  Boxes,
  ChevronRight,
  CreditCard,
  FileText,
  Info,
  LifeBuoy,
  LogOut,
  Megaphone,
  Palette,
  Plug,
  Settings as SettingsIcon,
  Shield,
  Truck,
  User,
  Users,
  Warehouse,
} from 'lucide-react-native';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '../../components/ui/Card';
import { useAuthStore } from '../../store/auth.store';

type Item = {
  href: string;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  adminOnly?: boolean;
};

const ITEMS: Item[] = [
  { href: '/inbox',     label: 'Inbox',           icon: <Bell size={18} color="#06D4B8" />,      iconBg: 'bg-emerald-50' },
  { href: '/help',      label: 'Help & Support',  icon: <LifeBuoy size={18} color="#2563eb" />,  iconBg: 'bg-sky-50' },
  { href: '/tickets',   label: 'My tickets',      icon: <FileText size={18} color="#04AB94" />,  iconBg: 'bg-emerald-50' },
  { href: '/changelog', label: "What's new",      icon: <Megaphone size={18} color="#7c3aed" />, iconBg: 'bg-violet-50' },
  { href: '/audit',     label: 'Activity log',    icon: <Activity size={18} color="#64748b" />,  iconBg: 'bg-slate-100' },
  { href: '/inventory', label: 'Inventory', icon: <Boxes size={18} color="#04AB94" />, iconBg: 'bg-emerald-50' },
  { href: '/purchases', label: 'Purchases', icon: <FileText size={18} color="#0ea5e9" />, iconBg: 'bg-sky-50' },
  { href: '/vendors', label: 'Vendors', icon: <Truck size={18} color="#8b5cf6" />, iconBg: 'bg-violet-50' },
  { href: '/warehouses', label: 'Warehouses', icon: <Warehouse size={18} color="#f59e0b" />, iconBg: 'bg-amber-50' },
  { href: '/customers', label: 'Customers', icon: <User size={18} color="#ec4899" />, iconBg: 'bg-pink-50' },
  { href: '/channels', label: 'Channels', icon: <Plug size={18} color="#06D4B8" />, iconBg: 'bg-emerald-50' },
  { href: '/shipments', label: 'Shipments', icon: <Truck size={18} color="#0ea5e9" />, iconBg: 'bg-sky-50' },
  { href: '/invoices', label: 'Invoices', icon: <CreditCard size={18} color="#8b5cf6" />, iconBg: 'bg-violet-50' },
  { href: '/team', label: 'Team', icon: <Users size={18} color="#04AB94" />, iconBg: 'bg-emerald-50' },
  { href: '/billing', label: 'Billing & Usage', icon: <CreditCard size={18} color="#f59e0b" />, iconBg: 'bg-amber-50' },
  { href: '/settings', label: 'Settings', icon: <SettingsIcon size={18} color="#64748b" />, iconBg: 'bg-slate-100' },
  { href: '/ui-kit',   label: 'UI Kit',   icon: <Palette size={18} color="#0ea5e9" />,        iconBg: 'bg-sky-50' },
  {
    href: '/admin',
    label: 'Platform Admin',
    icon: <Shield size={18} color="#f59e0b" />,
    iconBg: 'bg-amber-50',
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
    <SafeAreaView className="flex-1 bg-slate-900" edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile header */}
        <View
          className="bg-slate-900 px-6 pt-5 pb-8 rounded-b-[36px]"
          style={{
            shadowColor: '#0f172a',
            shadowOpacity: 0.2,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 8 },
            elevation: 10,
          }}
        >
          <Text className="text-[13px] text-slate-500 font-bold uppercase tracking-wider mb-5">
            Account
          </Text>
          <View className="flex-row items-center">
            <View
              className="w-14 h-14 rounded-2xl bg-emerald-500 items-center justify-center mr-4"
              style={{
                shadowColor: '#06D4B8',
                shadowOpacity: 0.4,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 4,
              }}
            >
              <Text className="text-white font-extrabold text-lg">{initials}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xl font-extrabold text-white tracking-tight">
                {user?.name ?? 'User'}
              </Text>
              <Text className="text-sm text-slate-400 font-medium" numberOfLines={1}>
                {user?.email}
              </Text>
              {tenant ? (
                <Text className="text-[12px] text-slate-500 mt-0.5 font-medium" numberOfLines={1}>
                  {tenant.businessName}
                </Text>
              ) : null}
            </View>
            <View className="bg-emerald-500/20 rounded-xl px-3 py-1.5">
              <Text className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wide">
                {user?.role?.replace('_', ' ')}
              </Text>
            </View>
          </View>
        </View>

        <View className="px-5 pt-6">
          {/* Navigation */}
          <Card className="overflow-hidden mb-5">
            {ITEMS.filter((i) => !i.adminOnly || isPlatformAdmin).map((item, idx, arr) => (
              <Link key={item.href} href={item.href as any} asChild>
                <Pressable
                  className={`flex-row items-center px-5 py-4 active:bg-slate-50 ${
                    idx < arr.length - 1 ? 'border-b border-slate-100/80' : ''
                  }`}
                >
                  <View
                    className={`w-10 h-10 rounded-2xl ${item.iconBg} items-center justify-center mr-3.5`}
                  >
                    {item.icon}
                  </View>
                  <Text className="flex-1 text-[15px] font-bold text-slate-900 tracking-tight">
                    {item.label}
                  </Text>
                  <ChevronRight size={18} color="#cbd5e1" />
                </Pressable>
              </Link>
            ))}
          </Card>

          {/* Sign out */}
          <Pressable
            onPress={onLogout}
            className="flex-row items-center justify-center bg-white border border-rose-100 rounded-2xl py-4 active:bg-rose-50 mb-5"
            style={{
              shadowColor: '#e11d48',
              shadowOpacity: 0.06,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 1,
            }}
          >
            <LogOut size={18} color="#e11d48" />
            <Text className="text-rose-600 font-bold ml-2.5 text-[15px]">Sign out</Text>
          </Pressable>

          {/* App info */}
          <View className="items-center py-6">
            <View className="flex-row items-center mb-1.5">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" />
              <Text className="text-[12px] text-slate-400 font-bold tracking-wide">
                Kartriq v{APP_VERSION}
              </Text>
            </View>
            <Text className="text-[11px] text-slate-300 font-medium">
              Multi-channel Commerce Platform
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
