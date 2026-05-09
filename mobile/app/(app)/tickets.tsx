/**
 * Mobile support tickets — mirrors web /tickets.
 *
 * On phones we use a master/detail pattern in one screen rather than
 * pushing a separate detail route, which keeps the back-button story
 * simple inside the (app) tab stack. The list view is the default; tap
 * a row to swap to the thread + reply form.
 */

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Check, LifeBuoy, Send, X,
} from 'lucide-react-native';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import PageShell from '../../components/ui/PageShell';
import { ticketApi } from '../../lib/api';
import { toast } from '../../store/toast.store';

interface TicketMessage {
  id: string;
  authorName: string;
  isStaff: boolean;
  body: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
  priority?: string;
  category?: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: TicketMessage[];
}

const STATUS_TINT: Record<string, { bg: string; text: string }> = {
  OPEN:     { bg: 'bg-rose-100',     text: 'text-rose-700' },
  PENDING:  { bg: 'bg-amber-100',    text: 'text-amber-700' },
  RESOLVED: { bg: 'bg-emerald-100',  text: 'text-emerald-700' },
  CLOSED:   { bg: 'bg-slate-200',    text: 'text-slate-600' },
};

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
  if (d < 14) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

export default function TicketsScreen() {
  const [activeId, setActiveId] = useState<string | null>(null);

  if (activeId) {
    return <TicketDetail id={activeId} onBack={() => setActiveId(null)} />;
  }
  return <TicketsList onOpen={setActiveId} />;
}

function TicketsList({ onOpen }: { onOpen: (id: string) => void }) {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => ticketApi.list().then((r) => (r.data || []) as Ticket[]),
  });
  const tickets = data ?? [];

  return (
    <PageShell
      title="Support tickets"
      subtitle="Open a ticket from Help & Support — replies arrive here and on email."
      loading={isLoading}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      {tickets.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy size={28} color="#94a3b8" />}
          title="No tickets yet"
          description="Tap Help & Support → Contact and send your first ticket."
        />
      ) : (
        <View className="gap-2">
          {tickets.map((t) => {
            const tint = STATUS_TINT[t.status] || STATUS_TINT.OPEN;
            return (
              <Pressable
                key={t.id}
                onPress={() => onOpen(t.id)}
                className="bg-white border border-slate-200 rounded-2xl p-4"
              >
                <View className="flex-row items-center gap-2 mb-1">
                  <View className={`px-1.5 py-0.5 rounded ${tint.bg}`}>
                    <Text className={`text-[10px] font-bold tracking-wider ${tint.text}`}>
                      {t.status}
                    </Text>
                  </View>
                  {t.category ? (
                    <Text className="text-[10px] font-medium text-slate-400">{t.category}</Text>
                  ) : null}
                  <Text className="ml-auto text-[10px] text-slate-400">{relTime(t.updatedAt)}</Text>
                </View>
                <Text numberOfLines={2} className="text-sm font-semibold text-slate-900">
                  {t.subject}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </PageShell>
  );
}

function TicketDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketApi.get(id).then((r) => r.data as Ticket),
  });
  const ticket = data;
  const tint = ticket ? STATUS_TINT[ticket.status] || STATUS_TINT.OPEN : STATUS_TINT.OPEN;
  const messages = ticket?.messages || [];

  const submit = async () => {
    if (!ticket || !reply.trim() || busy) return;
    setBusy(true);
    try {
      await ticketApi.reply(ticket.id, reply.trim());
      setReply('');
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['ticket', id] }),
        qc.invalidateQueries({ queryKey: ['tickets'] }),
      ]);
      toast.success('Reply sent', 'Support will get back to you on email too.');
    } catch (e: any) {
      toast.error(e?.message || 'Could not send reply', 'Reply failed');
    } finally { setBusy(false); }
  };

  const close = async () => {
    if (!ticket || busy) return;
    setBusy(true);
    try {
      await ticketApi.close(ticket.id);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['ticket', id] }),
        qc.invalidateQueries({ queryKey: ['tickets'] }),
      ]);
      toast.success('Ticket closed', '');
    } catch (e: any) {
      toast.error(e?.message || 'Could not close ticket', 'Close failed');
    } finally { setBusy(false); }
  };

  return (
    <PageShell
      title={ticket?.subject || 'Ticket'}
      subtitle={ticket ? `${ticket.status} · opened ${relTime(ticket.createdAt)} ago` : ''}
      loading={isLoading}
      refreshing={isRefetching}
      onRefresh={refetch}
      action={
        <Pressable
          onPress={onBack}
          accessibilityLabel="Back to ticket list"
          className="flex-row items-center gap-1 px-3 py-2 rounded-xl bg-slate-100"
        >
          <ArrowLeft size={14} color="#0f172a" />
          <Text className="text-xs font-bold text-slate-700">Back</Text>
        </Pressable>
      }
    >
      {!ticket ? null : (
        <View className="gap-3">
          {/* Status row */}
          <View className="flex-row items-center gap-2 flex-wrap">
            <View className={`px-2 py-0.5 rounded ${tint.bg}`}>
              <Text className={`text-[10px] font-bold tracking-wider ${tint.text}`}>
                {ticket.status}
              </Text>
            </View>
            {ticket.category ? (
              <Text className="text-xs text-slate-500 font-medium">{ticket.category}</Text>
            ) : null}
            {ticket.priority ? (
              <Text className="text-xs text-slate-400">priority: {String(ticket.priority).toLowerCase()}</Text>
            ) : null}
          </View>

          {/* Thread */}
          <View className="gap-2">
            {messages.map((m) => (
              <View
                key={m.id}
                className={m.isStaff ? 'self-start' : 'self-end'}
                style={{ maxWidth: '85%' }}
              >
                <View
                  className={`px-4 py-2.5 rounded-2xl ${
                    m.isStaff
                      ? 'bg-slate-100 rounded-bl-sm'
                      : 'bg-emerald-500 rounded-br-sm'
                  }`}
                >
                  <View className="flex-row items-center gap-2 mb-0.5">
                    <Text
                      className={`text-[10px] font-bold tracking-wider ${
                        m.isStaff ? 'text-slate-500' : 'text-white/80'
                      }`}
                    >
                      {m.isStaff ? 'SUPPORT' : (m.authorName || 'YOU').toUpperCase()}
                    </Text>
                    <Text
                      className={`text-[10px] ${
                        m.isStaff ? 'text-slate-400' : 'text-white/70'
                      }`}
                    >
                      {relTime(m.createdAt)}
                    </Text>
                  </View>
                  <Text
                    className={`text-sm leading-relaxed ${
                      m.isStaff ? 'text-slate-800' : 'text-white'
                    }`}
                  >
                    {m.body}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Reply or closed banner */}
          {ticket.status !== 'CLOSED' ? (
            <View className="gap-2">
              <TextInput
                value={reply}
                onChangeText={setReply}
                placeholder="Type your reply…"
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
                className="border border-slate-200 rounded-2xl p-3 bg-white text-sm text-slate-900 min-h-[100px]"
              />
              <View className="flex-row gap-2">
                <Button onPress={submit} loading={busy} leftIcon={<Send size={14} color="#fff" />}>
                  Send reply
                </Button>
                <Button variant="ghost" onPress={close} disabled={busy} leftIcon={<X size={14} color="#0f172a" />}>
                  Close ticket
                </Button>
              </View>
            </View>
          ) : (
            <View className="flex-row items-center justify-center gap-1.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <Check size={12} color="#64748b" />
              <Text className="text-xs text-slate-500">
                This ticket is closed. Open a new one if you need follow-up.
              </Text>
            </View>
          )}
        </View>
      )}
    </PageShell>
  );
}
