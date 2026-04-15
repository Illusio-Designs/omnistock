import { useQuery } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  MoreHorizontal,
  Package,
  PiggyBank,
  Plus,
  Send,
  TrendingDown,
  Wallet,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { channelApi, dashboardApi } from '../../lib/api';
import { formatCurrency, formatShortDate } from '../../lib/utils';
import { useAuthStore } from '../../store/auth.store';

type MonthPoint = { month: string; earnings: number };

// Minimal area chart — stays consistent with the emerald gradient used
// on the web dashboard without pulling in the whole victory-native bundle.
function RevenueChart({ data }: { data: MonthPoint[] }) {
  const width = Dimensions.get('window').width - 32 - 40; // screen - padding - card padding
  const height = 180;
  const pad = { top: 10, right: 8, bottom: 24, left: 8 };

  if (!data.length) {
    return (
      <View className="h-44 items-center justify-center">
        <Text className="text-slate-400 text-xs">No revenue data yet</Text>
      </View>
    );
  }

  const max = Math.max(...data.map((d) => d.earnings), 1);
  const min = 0;
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: pad.left + i * stepX,
    y: pad.top + innerH - ((d.earnings - min) / (max - min || 1)) * innerH,
  }));

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');
  const area = `${line} L ${points[points.length - 1].x} ${pad.top + innerH} L ${pad.left} ${
    pad.top + innerH
  } Z`;

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
            <Stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#grad)" />
        <Path d={line} stroke="#10b981" strokeWidth={2.5} fill="none" />
      </Svg>
      <View className="flex-row justify-between mt-1">
        {data.map((d) => (
          <Text key={d.month} className="text-[9px] text-slate-400 font-semibold">
            {d.month}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await dashboardApi.get()).data,
  });

  const { data: channelCatalog } = useQuery({
    queryKey: ['dashboard-channels'],
    queryFn: async () => (await channelApi.catalog()).data,
  });

  const s = data?.summary || {};
  const connectedChannels: any[] = (channelCatalog?.catalog || [])
    .filter((c: any) => c.status === 'connected')
    .slice(0, 4);

  const recentOrders: any[] = (data?.recentOrders || []).slice(0, 5);
  const chartData: MonthPoint[] = data?.revenueByMonth || [];

  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* ── Welcome header ──────────────────────────────── */}
        <View className="mb-5">
          <Text className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back {firstName} 👋
          </Text>
          <Text className="text-sm text-slate-500 mt-1">
            Monitor and control what happens with your commerce today.
          </Text>
        </View>

        {isLoading ? (
          <View className="py-8 items-center">
            <ActivityIndicator color="#10b981" />
          </View>
        ) : null}

        {/* ── Revenue card ─────────────────────────────────── */}
        <Card className="p-5 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-emerald-50 items-center justify-center mr-2">
                <Wallet size={15} color="#059669" />
              </View>
              <Text className="text-sm font-bold text-slate-700">Total Revenue</Text>
            </View>
            <Pressable className="p-1">
              <MoreHorizontal size={16} color="#94a3b8" />
            </Pressable>
          </View>
          <Text className="text-3xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(s.monthRevenue || 0)}
          </Text>
          <View className="flex-row items-center mt-2">
            <Badge variant="emerald">
              <ArrowUp size={10} color="#047857" /> 3.2%
            </Badge>
            <Text className="text-xs text-slate-400 ml-2">from last month</Text>
          </View>
          <View className="flex-row mt-5">
            <View className="flex-1 mr-2">
              <Button leftIcon={<Send size={12} color="#fff" />} size="sm">
                Sync Now
              </Button>
            </View>
            <View className="flex-1 ml-2">
              <Button variant="secondary" size="sm">
                Reports
              </Button>
            </View>
          </View>
        </Card>

        {/* ── Low stock + Orders (2-up grid) ───────────────── */}
        <View className="flex-row -mx-2 mb-4">
          <View className="flex-1 px-2">
            <Card className="p-4">
              <View className="flex-row items-center mb-3">
                <View className="w-8 h-8 rounded-lg bg-rose-50 items-center justify-center mr-2">
                  <TrendingDown size={15} color="#e11d48" />
                </View>
                <Text className="text-xs font-bold text-slate-700 flex-1" numberOfLines={1}>
                  Low Stock
                </Text>
              </View>
              <Text className="text-xl font-bold text-slate-900">
                {s.lowStockCount || 0}
              </Text>
              <View className="mt-2">
                <Badge variant="rose">
                  <ArrowDown size={10} color="#be123c" /> 2.3%
                </Badge>
              </View>
              <Text className="text-[10px] text-slate-500 mt-3">SKUs below reorder</Text>
            </Card>
          </View>
          <View className="flex-1 px-2">
            <Card className="p-4">
              <View className="flex-row items-center mb-3">
                <View className="w-8 h-8 rounded-lg bg-emerald-50 items-center justify-center mr-2">
                  <PiggyBank size={15} color="#059669" />
                </View>
                <Text className="text-xs font-bold text-slate-700 flex-1" numberOfLines={1}>
                  Total Orders
                </Text>
              </View>
              <Text className="text-xl font-bold text-slate-900">
                {(s.totalOrders || 0).toLocaleString()}
              </Text>
              <View className="mt-2">
                <Badge variant="emerald">
                  <ArrowUp size={10} color="#047857" /> 4.5%
                </Badge>
              </View>
              <Text className="text-[10px] text-slate-500 mt-3">
                {s.todayOrders || 0} today
              </Text>
            </Card>
          </View>
        </View>

        {/* ── Overview chart ─────────────────────────────── */}
        <Card className="p-5 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="font-bold text-slate-900">Overview</Text>
              <Text className="text-xs text-slate-500 mt-0.5">Revenue trend</Text>
            </View>
            <Badge variant="emerald" dot>
              Earnings
            </Badge>
          </View>
          <RevenueChart data={chartData} />
        </Card>

        {/* ── My Channels ─────────────────────────────────── */}
        <Card className="p-5 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-bold text-slate-900">My Channels</Text>
            <View className="flex-row items-center">
              <Plus size={12} color="#059669" />
              <Text className="text-xs font-bold text-emerald-600 ml-1">Add New</Text>
            </View>
          </View>
          {connectedChannels.length > 0 ? (
            connectedChannels.map((c) => (
              <View
                key={c.type}
                className="flex-row items-center justify-between p-3 rounded-xl mb-1"
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-lg bg-emerald-500 items-center justify-center mr-3">
                    <Text className="text-white font-bold text-xs">
                      {String(c.name || '').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text className="text-xs text-slate-500 font-semibold">
                      {c.connectedChannels?.length || 0} active
                    </Text>
                  </View>
                </View>
                <Badge variant="emerald" dot>
                  Active
                </Badge>
              </View>
            ))
          ) : (
            <View className="p-6 items-center rounded-xl border-2 border-dashed border-slate-200">
              <Plus size={20} color="#94a3b8" />
              <Text className="text-sm font-bold text-slate-700 mt-2">Connect a channel</Text>
              <Text className="text-xs text-slate-500 mt-0.5">
                Start selling on Amazon, Flipkart & more
              </Text>
            </View>
          )}
        </Card>

        {/* ── Inventory Targets ───────────────────────────── */}
        <Card className="p-5 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-bold text-slate-900">Inventory Targets</Text>
            <MoreHorizontal size={16} color="#94a3b8" />
          </View>
          {[
            { name: 'Reorder Point', current: 15600, target: 25000, pct: 62 },
            {
              name: 'Monthly Target',
              current: s.monthRevenue || 0,
              target: 100000,
              pct: Math.min(100, Math.round(((s.monthRevenue || 0) / 100000) * 100)),
            },
            {
              name: 'Product Listings',
              current: s.totalProducts || 0,
              target: 500,
              pct: Math.min(100, Math.round(((s.totalProducts || 0) / 500) * 100)),
            },
          ].map((g) => (
            <View key={g.name} className="p-3 rounded-xl bg-slate-50 mb-2">
              <View className="flex-row items-center mb-2">
                <View className="w-9 h-9 rounded-lg bg-white border border-slate-200 items-center justify-center mr-3">
                  <Package size={14} color="#059669" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-slate-900">{g.name}</Text>
                  <Text className="text-xs text-slate-500">
                    {g.current > 1000 ? formatCurrency(g.current) : g.current.toLocaleString()}
                    {' / '}
                    {g.target > 1000 ? formatCurrency(g.target) : g.target.toLocaleString()}
                  </Text>
                </View>
                <Text className="text-xs font-bold text-emerald-600">{g.pct}%</Text>
              </View>
              <View className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <View
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min(100, g.pct)}%` }}
                />
              </View>
            </View>
          ))}
        </Card>

        {/* ── Recent Transactions ─────────────────────────── */}
        <Card className="overflow-hidden">
          <View className="flex-row items-center justify-between p-5 pb-3">
            <Text className="font-bold text-slate-900">Recent Transactions</Text>
            <View className="flex-row items-center">
              <Text className="text-xs font-bold text-emerald-600 mr-1">View All</Text>
              <ArrowUpRight size={11} color="#059669" />
            </View>
          </View>
          <View>
            {recentOrders.length > 0 ? (
              recentOrders.map((o, idx) => (
                <View
                  key={o.id}
                  className={`px-5 py-4 flex-row items-center ${
                    idx > 0 ? 'border-t border-slate-100' : ''
                  }`}
                >
                  <View className="w-10 h-10 rounded-lg bg-emerald-50 items-center justify-center mr-3">
                    <Package size={15} color="#059669" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-slate-900 text-sm" numberOfLines={1}>
                      {o.orderNumber}
                    </Text>
                    <Text className="text-xs text-slate-500" numberOfLines={1}>
                      {o.customer?.name ?? '—'}
                    </Text>
                    <Text className="text-[10px] text-slate-400 mt-0.5">
                      {o.createdAt ? formatShortDate(o.createdAt) : ''}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm font-bold text-slate-900">
                      {formatCurrency(o.total || 0)}
                    </Text>
                    <View className="mt-1">
                      <Badge variant="emerald" dot>
                        Success
                      </Badge>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View className="py-10 items-center">
                <Text className="text-sm text-slate-400">No recent orders yet</Text>
              </View>
            )}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
