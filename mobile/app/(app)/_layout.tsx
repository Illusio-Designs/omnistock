import { Redirect, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  Home,
  Menu,
  Package,
  ShoppingCart,
} from 'lucide-react-native';
import { Platform, View } from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import MaintenanceScreen from '../../components/MaintenanceScreen';
import axios from 'axios';
import Constants from 'expo-constants';

const API =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ||
  'https://api.finvera.solutions/api/v1';

export default function AppLayout() {
  const token = useAuthStore((s) => s.token);
  const isPlatformAdmin = useAuthStore((s) => s.isPlatformAdmin());
  const [maintenance, setMaintenance] = useState<{
    enabled: boolean;
    message: string;
    eta: string;
  } | null>(null);

  useEffect(() => {
    axios
      .get(`${API}/public/maintenance`)
      .then((r) => setMaintenance(r.data))
      .catch(() => {});
  }, []);

  if (!token) return <Redirect href="/login" />;

  if (maintenance?.enabled && !isPlatformAdmin) {
    return (
      <MaintenanceScreen
        message={maintenance.message}
        eta={maintenance.eta}
      />
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#06D4B8',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View className={`p-1.5 rounded-xl ${focused ? 'bg-emerald-50' : ''}`}>
              <Home color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, focused }) => (
            <View className={`p-1.5 rounded-xl ${focused ? 'bg-emerald-50' : ''}`}>
              <ShoppingCart color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, focused }) => (
            <View className={`p-1.5 rounded-xl ${focused ? 'bg-emerald-50' : ''}`}>
              <Package color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, focused }) => (
            <View className={`p-1.5 rounded-xl ${focused ? 'bg-emerald-50' : ''}`}>
              <BarChart3 color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => (
            <View className={`p-1.5 rounded-xl ${focused ? 'bg-emerald-50' : ''}`}>
              <Menu color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      {/* Hidden from tab bar */}
      <Tabs.Screen name="inventory" options={{ href: null, title: 'Inventory' }} />
      <Tabs.Screen name="purchases" options={{ href: null, title: 'Purchases' }} />
      <Tabs.Screen name="vendors" options={{ href: null, title: 'Vendors' }} />
      <Tabs.Screen name="warehouses" options={{ href: null, title: 'Warehouses' }} />
      <Tabs.Screen name="customers" options={{ href: null, title: 'Customers' }} />
      <Tabs.Screen name="channels" options={{ href: null, title: 'Channels' }} />
      <Tabs.Screen name="shipments" options={{ href: null, title: 'Shipments' }} />
      <Tabs.Screen name="invoices" options={{ href: null, title: 'Invoices' }} />
      <Tabs.Screen name="settings" options={{ href: null, title: 'Settings' }} />
      <Tabs.Screen name="team" options={{ href: null, title: 'Team' }} />
      <Tabs.Screen name="billing" options={{ href: null, title: 'Billing' }} />
      <Tabs.Screen name="admin" options={{ href: null, title: 'Admin' }} />
      <Tabs.Screen name="ui-kit" options={{ href: null, title: 'UI Kit' }} />
      {/* Hidden — reached from the dashboard bell icon and the More menu */}
      <Tabs.Screen name="inbox"     options={{ href: null, title: 'Inbox' }} />
      <Tabs.Screen name="help"      options={{ href: null, title: 'Help & Support' }} />
      <Tabs.Screen name="tickets"   options={{ href: null, title: 'Support tickets' }} />
      <Tabs.Screen name="audit"     options={{ href: null, title: 'Activity log' }} />
      <Tabs.Screen name="changelog" options={{ href: null, title: "What's new" }} />
    </Tabs>
  );
}
