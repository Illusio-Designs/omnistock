import { Redirect, Tabs } from 'expo-router';
import {
  BarChart3,
  Home,
  Menu,
  Package,
  ShoppingCart,
} from 'lucide-react-native';
import { useAuthStore } from '../../store/auth.store';

export default function AppLayout() {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#10b981',
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { color: '#0f172a' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <Menu color={color} size={size} />,
        }}
      />
      {/* Hidden from tab bar — navigated to from "More" menu */}
      <Tabs.Screen name="inventory" options={{ href: null, title: 'Inventory' }} />
      <Tabs.Screen name="purchases" options={{ href: null, title: 'Purchases' }} />
      <Tabs.Screen name="vendors" options={{ href: null, title: 'Vendors' }} />
      <Tabs.Screen name="warehouses" options={{ href: null, title: 'Warehouses' }} />
      <Tabs.Screen name="customers" options={{ href: null, title: 'Customers' }} />
      <Tabs.Screen name="channels" options={{ href: null, title: 'Channels' }} />
      <Tabs.Screen name="shipments" options={{ href: null, title: 'Shipments' }} />
      <Tabs.Screen name="invoices" options={{ href: null, title: 'Invoices' }} />
      <Tabs.Screen name="settings" options={{ href: null, title: 'Settings' }} />
      <Tabs.Screen name="admin" options={{ href: null, title: 'Admin' }} />
    </Tabs>
  );
}
