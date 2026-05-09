/**
 * Mobile inbox screen — mirrors the web InboxDrawer.
 *
 * Shows the tenant feed (notifications targeting the user OR broadcast
 * to the whole tenant), with category filter chips and pull-to-refresh.
 * Tapping a row marks it read and routes to its `link` if present.
 *
 * The platform-admin scope toggle from the web drawer is omitted —
 * founders run the platform from desktop, so the mobile inbox is
 * tenant-only by design.
 */

import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle, AlertTriangle, Bell, CheckCircle2, CreditCard, Info,
  Inbox as InboxIcon, LifeBuoy, MessageSquare, Package, Sparkles,
  ShoppingCart, UserPlus,
} from 'lucide-react-native';
import {
  notificationApi, type InboxNotification, type NotificationCategory,
  type NotificationSeverity,
} from '../../lib/api';
import EmptyState from '../../components/ui/EmptyState';
import PageShell from '../../components/ui/PageShell';
import { toast } from '../../store/toast.store';

const CATEGORY_META: Record<NotificationCategory, { label: string; Icon: any; color: string }> = {
  orders:    { label: 'Orders',    Icon: ShoppingCart,  color: '#04AB94' },
  inventory: { label: 'Inventory', Icon: Package,       color: '#d97706' },
  tickets:   { label: 'Support',   Icon: LifeBuoy,      color: '#2563eb' },
  leads:     { label: 'Leads',     Icon: MessageSquare, color: '#7c3aed' },
  payments:  { label: 'Payments',  Icon: CreditCard,    color: '#04AB94' },
  signup:    { label: 'Signups',   Icon: UserPlus,      color: '#c026d3' },
  plan:      { label: 'Plan',      Icon: Sparkles,      color: '#04AB94' },
  channel:   { label: 'Channels',  Icon: Bell,          color: '#2563eb' },
  team:      { label: 'Team',      Icon: UserPlus,      color: '#2563eb' },
  system:    { label: 'System',    Icon: Bell,          color: '#64748b' },
};

const SEVERITY: Record<NotificationSeverity, { Icon: any; bg: string; tint: string }> = {
  info:    { Icon: Info,          bg: 'bg-slate-100',   tint: '#475569' },
  success: { Icon: CheckCircle2,  bg: 'bg-emerald-50',  tint: '#04AB94' },
  warning: { Icon: AlertTriangle, bg: 'bg-amber-50',    tint: '#d97706' },
  error:   { Icon: AlertCircle,   bg: 'bg-rose-50',     tint: '#e11d48' },
};

const TENANT_CATEGORIES: NotificationCategory[] = [
  'orders', 'inventory', 'tickets', 'payments', 'plan', 'team', 'system',
];

function relTime(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

export default function InboxScreen() {
  const qc = useQueryClient();
  const [category, setCategory] = useState<NotificationCategory | ''>('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const params = useMemo(() => ({
    category: category || undefined,
    unreadOnly: unreadOnly || undefined,
    limit: 50,
  }), [category, unreadOnly]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationApi.list(params).then((r) => r.data),
    refetchInterval: 60_000,
  });

  const items = data?.notifications ?? [];
  const unread = data?.unread ?? 0;

  const onPressRow = useCallback(async (n: InboxNotification) => {
    if (!n.isRead) {
      try {
        await notificationApi.markRead(n.id);
        qc.invalidateQueries({ queryKey: ['notifications'] });
        qc.invalidateQueries({ queryKey: ['notifications-unread'] });
      } catch {/* swallow — best effort */}
    }
    if (n.link) {
      // Mobile route shapes don't always match web URLs; for now route to
      // the closest matching tab if it exists, else stay put. Most current
      // notifications target /orders/:id, /tickets/:id etc. — we drop into
      // the list page since detail screens may not exist on mobile yet.
      const seg = n.link.replace(/^\/+/, '').split('/')[0];
      const known = ['orders', 'inventory', 'tickets', 'channels', 'shipments', 'invoices', 'billing', 'team'];
      if (seg && known.includes(seg)) router.push(`/${seg}` as any);
    }
  }, [qc]);

  const onMarkAllRead = useCallback(async () => {
    if (unread === 0) return;
    try {
      await notificationApi.markAllRead();
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
      toast.success('All notifications marked as read.', 'Inbox cleared');
    } catch (e: any) {
      toast.error(e?.message || 'Please try again.', 'Could not mark read');
    }
  }, [qc, unread]);

  return (
    <PageShell
      title="Inbox"
      subtitle={unread > 0 ? `${unread} unread` : 'All caught up'}
      loading={isLoading}
      refreshing={isRefetching}
      onRefresh={refetch}
      action={
        unread > 0 ? (
          <Pressable
            onPress={onMarkAllRead}
            className="px-3 py-2 rounded-xl bg-emerald-50"
          >
            <Text className="text-xs font-bold text-emerald-700">Mark all read</Text>
          </Pressable>
        ) : null
      }
    >
      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
        className="mb-3 -mx-1"
      >
        <Chip label="All" active={category === ''} onPress={() => setCategory('')} />
        {TENANT_CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={CATEGORY_META[c].label}
            active={category === c}
            onPress={() => setCategory(c)}
          />
        ))}
        <Chip
          label={unreadOnly ? 'Unread ✓' : 'Unread'}
          active={unreadOnly}
          onPress={() => setUnreadOnly((v) => !v)}
        />
      </ScrollView>

      {items.length === 0 ? (
        <EmptyState
          icon={<InboxIcon size={28} color="#94a3b8" />}
          title="Nothing here"
          description="Notifications about orders, payments, and inventory will land here."
        />
      ) : (
        <View className="gap-2">
          {items.map((n) => (
            <NotifRow key={n.id} n={n} onPress={() => onPressRow(n)} />
          ))}
        </View>
      )}
    </PageShell>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3 py-1.5 rounded-full border ${
        active
          ? 'bg-emerald-50 border-emerald-300'
          : 'bg-white border-slate-200'
      }`}
    >
      <Text className={`text-xs font-bold ${active ? 'text-emerald-700' : 'text-slate-600'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function NotifRow({ n, onPress }: { n: InboxNotification; onPress: () => void }) {
  const cat = CATEGORY_META[n.category] || CATEGORY_META.system;
  const sev = SEVERITY[n.severity] || SEVERITY.info;
  const SevIcon = sev.Icon;
  const CatIcon = cat.Icon;
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row gap-3 p-4 rounded-2xl border ${
        n.isRead
          ? 'bg-white border-slate-200'
          : 'bg-emerald-50/50 border-emerald-100'
      }`}
    >
      <View className={`w-10 h-10 rounded-xl items-center justify-center ${sev.bg}`}>
        <SevIcon size={18} color={sev.tint} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-baseline gap-2">
          <Text
            numberOfLines={1}
            className={`flex-1 text-sm ${n.isRead ? 'font-semibold text-slate-700' : 'font-bold text-slate-900'}`}
          >
            {n.title}
          </Text>
          <Text className="text-[10px] text-slate-400">{relTime(n.createdAt)}</Text>
        </View>
        {n.body ? (
          <Text numberOfLines={2} className="text-xs text-slate-600 mt-1 leading-relaxed">
            {n.body}
          </Text>
        ) : null}
        <View className="flex-row items-center gap-1.5 mt-2">
          <CatIcon size={11} color={cat.color} />
          <Text className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
            {cat.label}
          </Text>
          {!n.isRead && (
            <View className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
          )}
        </View>
      </View>
    </Pressable>
  );
}
