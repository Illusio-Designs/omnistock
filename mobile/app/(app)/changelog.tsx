/**
 * "What's new" — release-notes feed on mobile.
 *
 * CMS-managed by founders via the desktop /admin/changelog page.
 * Mobile fetches `audience=tenant` so internal founder-only release
 * notes never reach a customer's phone.
 *
 * Read-only on mobile. Tracks the last-seen entry id in expo-secure-store
 * the same way the web drawer tracks it in localStorage, so the
 * dashboard megaphone can grow a red dot when something new ships.
 */

import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Megaphone, ShieldAlert, Sparkles, Wrench } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import EmptyState from '../../components/ui/EmptyState';
import PageShell from '../../components/ui/PageShell';
import { changelogApi, type ChangelogEntry, type ChangelogTag } from '../../lib/api';

const TAG_META: Record<ChangelogTag, { label: string; bg: string; tint: string; Icon: any }> = {
  feature:  { label: 'NEW',      bg: 'bg-emerald-50 border-emerald-200', tint: 'text-emerald-700', Icon: Sparkles },
  improve:  { label: 'IMPROVED', bg: 'bg-violet-50 border-violet-200',   tint: 'text-violet-700',  Icon: ArrowUpRight },
  fix:      { label: 'FIX',      bg: 'bg-blue-50 border-blue-200',       tint: 'text-blue-700',    Icon: Wrench },
  security: { label: 'SECURITY', bg: 'bg-rose-50 border-rose-200',       tint: 'text-rose-700',    Icon: ShieldAlert },
};

const STORAGE_KEY = 'changelog-last-seen';

function fmtDate(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ChangelogScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['changelog', 'tenant'],
    queryFn: () => changelogApi.list('tenant').then((r) => r.data || []),
  });

  const entries = data ?? [];

  // Mark the newest entry as seen on first paint so the unread dot in
  // the topbar / dashboard clears. Web uses localStorage; native uses
  // expo-secure-store with the same key for parity.
  useEffect(() => {
    const newest = entries[0];
    if (!newest) return;
    SecureStore.setItemAsync(STORAGE_KEY, newest.id).catch(() => {});
  }, [entries]);

  return (
    <PageShell
      title="What's new"
      subtitle="Recent releases and improvements."
      loading={isLoading}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      {entries.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={28} color="#94a3b8" />}
          title="No releases yet"
          description="Release notes from the team will appear here."
        />
      ) : (
        <View className="gap-3">
          {entries.map((e) => <EntryCard key={e.id} entry={e} />)}
        </View>
      )}
    </PageShell>
  );
}

function EntryCard({ entry }: { entry: ChangelogEntry }) {
  const meta = TAG_META[entry.tag] || TAG_META.feature;
  const TagIcon = meta.Icon;
  const date = entry.date || entry.publishedAt || entry.createdAt;
  return (
    <View className="bg-white border border-slate-200 rounded-2xl p-4">
      <View className="flex-row items-center gap-2">
        <View className={`flex-row items-center gap-1 px-2 py-1 rounded-full border ${meta.bg}`}>
          <TagIcon size={10} color={meta.tint.includes('emerald') ? '#04AB94' : meta.tint.includes('violet') ? '#7c3aed' : meta.tint.includes('rose') ? '#e11d48' : '#2563eb'} />
          <Text className={`text-[10px] font-bold tracking-wider ${meta.tint}`}>
            {meta.label}
          </Text>
        </View>
        {date ? (
          <Text className="text-[11px] text-slate-400">{fmtDate(date)}</Text>
        ) : null}
      </View>
      <Text className="text-sm font-bold text-slate-900 mt-2">{entry.title}</Text>
      <View className="mt-2 gap-1.5">
        {entry.highlights.map((h, i) => (
          <View key={i} className="flex-row gap-2">
            <View className="w-1 h-1 rounded-full bg-emerald-500 mt-2" />
            <Text className="flex-1 text-xs text-slate-600 leading-relaxed">{h}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
