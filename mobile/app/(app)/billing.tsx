import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Boxes,
  CheckCircle2,
  CreditCard,
  Package,
  Plug,
  Plus,
  ShoppingCart,
  Users,
  Wallet,
  Zap,
} from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Badge from '../../components/ui/Badge';
import BottomSheet from '../../components/ui/BottomSheet';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import FormInput from '../../components/ui/FormInput';
import ListRow from '../../components/ui/ListRow';
import PageShell from '../../components/ui/PageShell';
import { billingApi } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

const TOPUP_PRESETS = [500, 1000, 2500, 5000];

type UsageRow = {
  key: string;
  label: string;
  used: number;
  limit: number | null;
  icon: React.ReactNode;
  color: string;
  overage?: number;
  overageRate?: number;
  overageCharge?: number;
};

export default function BillingScreen() {
  const qc = useQueryClient();
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['billing', 'usage'],
    queryFn: async () => (await billingApi.usage()).data,
  });

  const { data: wallet, refetch: refetchWallet } = useQuery({
    queryKey: ['billing', 'wallet'],
    queryFn: async () => (await billingApi.wallet()).data,
  });

  const { data: txns } = useQuery({
    queryKey: ['billing', 'wallet', 'txns'],
    queryFn: async () => (await billingApi.walletTransactions(20)).data,
  });

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => billingApi.togglePayg(enabled),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing', 'usage'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to toggle PAYG');
    },
  });

  const topupMutation = useMutation({
    mutationFn: (amount: number) => billingApi.topupWallet(amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing'] });
      setShowTopup(false);
      setTopupAmount('');
      Alert.alert('Success', 'Wallet topped up');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'Top-up failed');
    },
  });

  const plan = data?.plan;
  const used = data?.used || {};
  const limits = data?.limits || {};
  const overage = data?.overage || {};
  const charges = data?.overageCharges || {};
  const rates = data?.rates || {};
  const isPayg = !!data?.subscription?.payAsYouGo;
  const totalOverage = data?.totalOverageCost || 0;

  const rows: UsageRow[] = [
    {
      key: 'ordersThisPeriod',
      label: 'Orders this month',
      used: used.ordersThisPeriod || 0,
      limit: limits.ordersPerMonth ?? null,
      icon: <ShoppingCart size={18} color="#059669" />,
      color: '#10b981',
      overage: overage.orders,
      overageRate: Number(rates.extraOrders || 0),
      overageCharge: charges.orders,
    },
    {
      key: 'channels',
      label: 'Channels connected',
      used: used.channels || 0,
      limit: limits.channels ?? null,
      icon: <Plug size={18} color="#0ea5e9" />,
      color: '#0ea5e9',
      overage: overage.channels,
      overageRate: Number(rates.extraChannels || 0),
      overageCharge: charges.channels,
    },
    {
      key: 'users',
      label: 'Team members',
      used: used.users || 0,
      limit: limits.users ?? null,
      icon: <Users size={18} color="#8b5cf6" />,
      color: '#8b5cf6',
      overage: overage.users,
      overageRate: Number(rates.extraUsers || 0),
      overageCharge: charges.users,
    },
    {
      key: 'skus',
      label: 'Products / SKUs',
      used: used.skus || 0,
      limit: limits.skus ?? null,
      icon: <Package size={18} color="#f59e0b" />,
      color: '#f59e0b',
      overage: overage.skus,
      overageRate: Number(rates.extraSkus || 0),
      overageCharge: charges.skus,
    },
    {
      key: 'facilities',
      label: 'Warehouses',
      used: used.facilities || 0,
      limit: limits.facilities ?? null,
      icon: <Boxes size={18} color="#ec4899" />,
      color: '#ec4899',
    },
  ];

  const onTogglePayg = () => {
    const next = !isPayg;
    Alert.alert(
      next ? 'Enable Pay-As-You-Go?' : 'Disable Pay-As-You-Go?',
      next
        ? 'You will be billed for usage beyond your plan limits at the rates shown. You can disable this anytime.'
        : 'Once disabled, you will be blocked from creating new items when your plan limit is reached.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next ? 'Enable' : 'Disable',
          style: next ? 'default' : 'destructive',
          onPress: () => toggleMutation.mutate(next),
        },
      ]
    );
  };

  return (
    <PageShell
      title="Billing & Usage"
      subtitle="Plan, overage, pay-as-you-go"
      loading={isLoading}
      error={error}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      {/* Current plan */}
      {plan ? (
        <Card className="p-5 mb-4">
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 rounded-2xl bg-emerald-50 items-center justify-center mr-3">
              <CreditCard size={18} color="#059669" />
            </View>
            <View className="flex-1">
              <Text className="text-[13px] font-bold text-slate-400 uppercase tracking-wider">
                Current plan
              </Text>
              <Text className="text-xl font-extrabold text-slate-900 tracking-tight">
                {plan.name}
              </Text>
            </View>
            <Badge variant={data?.subscription?.status === 'ACTIVE' ? 'emerald' : 'amber'} dot>
              {data?.subscription?.status || 'ACTIVE'}
            </Badge>
          </View>
          {plan.tagline ? (
            <Text className="text-[13px] text-slate-500 font-medium">{plan.tagline}</Text>
          ) : null}
          {plan.monthlyPrice > 0 ? (
            <Text className="text-[13px] text-slate-600 font-bold mt-2">
              {formatCurrency(plan.monthlyPrice)} / month
            </Text>
          ) : null}
        </Card>
      ) : null}

      {/* Wallet */}
      <Card className="p-5 mb-4">
        <View className="flex-row items-start mb-4">
          <View className="w-10 h-10 rounded-2xl bg-emerald-50 items-center justify-center mr-3">
            <Wallet size={18} color="#059669" />
          </View>
          <View className="flex-1">
            <Text className="text-[13px] font-bold text-slate-400 uppercase tracking-wider">
              Wallet Balance
            </Text>
            <Text className={`text-3xl font-extrabold tracking-tight ${wallet?.lowBalance ? 'text-rose-600' : 'text-slate-900'}`}>
              {formatCurrency(wallet?.balance ?? 0)}
            </Text>
            {wallet?.lowBalance ? (
              <Text className="text-[12px] text-rose-600 font-bold mt-1">
                Low balance — top up soon
              </Text>
            ) : (
              <Text className="text-[12px] text-slate-500 font-medium mt-1">
                Used for overage charges
              </Text>
            )}
          </View>
        </View>

        <Button
          onPress={() => setShowTopup(true)}
          leftIcon={<Plus size={14} color="#fff" />}
          size="sm"
        >
          Top up wallet
        </Button>

        {/* Recent transactions */}
        {Array.isArray(txns) && txns.length > 0 ? (
          <View className="mt-4 pt-4 border-t border-slate-100">
            <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Recent transactions
            </Text>
            {txns.slice(0, 5).map((t: any) => {
              const isCredit = ['TOPUP', 'REFUND', 'ADJUSTMENT_CREDIT'].includes(t.type);
              const amt = Number(t.amount);
              return (
                <View
                  key={t.id}
                  className="flex-row items-center py-2 border-b border-slate-50 last:border-b-0"
                >
                  <View className={`w-8 h-8 rounded-xl items-center justify-center mr-3 ${
                    isCredit ? 'bg-emerald-50' : 'bg-rose-50'
                  }`}>
                    <Text className={`text-sm font-bold ${isCredit ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {isCredit ? '+' : '-'}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[13px] font-bold text-slate-900" numberOfLines={1}>
                      {t.description || t.type}
                    </Text>
                    <Text className="text-[10px] text-slate-400 font-medium">
                      {new Date(t.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <Text className={`text-[13px] font-extrabold ${
                    isCredit ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {isCredit ? '+' : ''}{formatCurrency(Math.abs(amt))}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </Card>

      {/* Top-up modal */}
      <BottomSheet visible={showTopup} onClose={() => setShowTopup(false)} title="Top up wallet">
        <Text className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-3">
          Quick amounts
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-5">
          {TOPUP_PRESETS.map((amt) => (
            <Pressable
              key={amt}
              onPress={() => setTopupAmount(String(amt))}
              className={`px-5 py-3 rounded-2xl border ${
                topupAmount === String(amt)
                  ? 'bg-emerald-600 border-emerald-600'
                  : 'bg-white border-slate-200 active:bg-slate-50'
              }`}
            >
              <Text className={`text-[14px] font-bold ${
                topupAmount === String(amt) ? 'text-white' : 'text-slate-700'
              }`}>
                {formatCurrency(amt)}
              </Text>
            </Pressable>
          ))}
        </View>

        <FormInput
          label="Or enter amount"
          value={topupAmount}
          onChangeText={setTopupAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />

        <View className="bg-slate-50 rounded-2xl p-3 mb-5">
          <Text className="text-[11px] text-slate-500 font-medium">
            Payments are processed securely. In production this would redirect to Razorpay / Stripe.
          </Text>
        </View>

        <Button
          onPress={() => {
            const n = parseFloat(topupAmount);
            if (!n || n <= 0) {
              Alert.alert('Invalid', 'Enter a valid amount');
              return;
            }
            topupMutation.mutate(n);
          }}
          loading={topupMutation.isPending}
          disabled={!topupAmount || parseFloat(topupAmount) <= 0}
        >
          Add {topupAmount ? formatCurrency(parseFloat(topupAmount) || 0) : 'credit'}
        </Button>
      </BottomSheet>

      {/* PAYG toggle */}
      <Card className="p-5 mb-4">
        <View className="flex-row items-start mb-4">
          <View className="w-10 h-10 rounded-2xl bg-amber-50 items-center justify-center mr-3">
            <Zap size={18} color="#f59e0b" />
          </View>
          <View className="flex-1">
            <Text className="text-[15px] font-bold text-slate-900 tracking-tight">
              Pay-As-You-Go
            </Text>
            <Text className="text-[13px] text-slate-500 font-medium mt-1">
              Keep working past plan limits. Pay only for what you use.
            </Text>
          </View>
          <Pressable
            onPress={onTogglePayg}
            disabled={toggleMutation.isPending}
            className={`w-12 h-7 rounded-full justify-center ${isPayg ? 'bg-emerald-500' : 'bg-slate-300'}`}
            style={{ opacity: toggleMutation.isPending ? 0.6 : 1 }}
          >
            <View
              className={`w-6 h-6 rounded-full bg-white shadow-sm ${isPayg ? 'self-end mr-0.5' : 'self-start ml-0.5'}`}
              style={{ shadowColor: '#0f172a', shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 }}
            />
          </Pressable>
        </View>

        {/* Rate breakdown */}
        <View className="bg-slate-50 rounded-2xl p-3">
          <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Overage rates
          </Text>
          {[
            { label: 'Extra order', rate: rates.extraOrders },
            { label: 'Extra channel', rate: rates.extraChannels },
            { label: 'Extra user', rate: rates.extraUsers },
            { label: 'Extra SKU', rate: rates.extraSkus },
          ].map((r) =>
            r.rate ? (
              <View key={r.label} className="flex-row justify-between py-1">
                <Text className="text-[13px] text-slate-600 font-medium">{r.label}</Text>
                <Text className="text-[13px] font-bold text-slate-900">
                  {formatCurrency(Number(r.rate))}
                </Text>
              </View>
            ) : null
          )}
        </View>

        {totalOverage > 0 ? (
          <View className="mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-100">
            <Text className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Current overage this period
            </Text>
            <Text className="text-xl font-extrabold text-amber-800 mt-1">
              + {formatCurrency(totalOverage)}
            </Text>
            <Text className="text-[12px] text-amber-600 font-medium mt-1">
              Billed at end of period
            </Text>
          </View>
        ) : null}
      </Card>

      {/* Usage rows */}
      <Text className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
        Usage this period
      </Text>
      <Card className="overflow-hidden">
        {rows.map((r, idx) => {
          const hasLimit = r.limit != null;
          const pct = hasLimit ? Math.min(100, (r.used / (r.limit || 1)) * 100) : 0;
          const over = hasLimit && r.used > (r.limit || 0);
          return (
            <View
              key={r.key}
              className={`p-4 ${idx > 0 ? 'border-t border-slate-100' : ''}`}
            >
              <View className="flex-row items-center mb-2">
                <View
                  className="w-10 h-10 rounded-2xl items-center justify-center mr-3"
                  style={{ backgroundColor: r.color + '15' }}
                >
                  {r.icon}
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-bold text-slate-900 tracking-tight">
                    {r.label}
                  </Text>
                  {r.overage && r.overage > 0 && r.overageCharge ? (
                    <Text className="text-[12px] text-amber-600 font-bold mt-0.5">
                      +{r.overage} over limit \u00B7 {formatCurrency(r.overageCharge)}
                    </Text>
                  ) : null}
                </View>
                <Text className="text-[17px] font-extrabold text-slate-900 tracking-tight">
                  {r.used.toLocaleString()}
                  {hasLimit ? (
                    <Text className="text-slate-400 font-bold"> / {r.limit!.toLocaleString()}</Text>
                  ) : (
                    <Text className="text-slate-400 font-bold"> / \u221E</Text>
                  )}
                </Text>
              </View>
              {hasLimit ? (
                <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      backgroundColor: over ? '#f59e0b' : r.color,
                    }}
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </Card>

      {isPayg ? (
        <View className="flex-row items-center mt-4 p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
          <CheckCircle2 size={16} color="#059669" />
          <Text className="text-[13px] font-bold text-emerald-700 ml-2 flex-1">
            Pay-As-You-Go active \u00B7 Overage allowed
          </Text>
        </View>
      ) : null}
    </PageShell>
  );
}
