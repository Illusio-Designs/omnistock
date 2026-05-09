'use client';

/**
 * Tenant-side support tickets page.
 *
 * Lists the caller's own tickets (server filters by tenantId on
 * /tickets), with a detail panel that shows the full message thread
 * and an inline reply form. The HelpDrawer's "My tickets" link and
 * the UserMenu both point here.
 */

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ticketApi } from '@/lib/api';
import { useSearchStore } from '@/store/search.store';
import {
  LifeBuoy, Send, MessageSquare, X as XIcon, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Loader } from '@/components/ui/Loader';

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
  _count?: { messages?: number };
}

const STATUS_COLORS: Record<string, string> = {
  OPEN:     'bg-rose-100 text-rose-700',
  PENDING:  'bg-amber-100 text-amber-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED:   'bg-slate-200 text-slate-600',
};

function fmtRel(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 14) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const query = useSearchStore((s) => s.query);

  const load = async () => {
    setLoading(true);
    try {
      const r = await ticketApi.list();
      const list: Ticket[] = r.data || [];
      setTickets(list);
      if (!activeId && list[0]) setActiveId(list[0].id);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!activeId) { setActive(null); return; }
    ticketApi.get(activeId).then((r) => setActive(r.data));
  }, [activeId]);

  const filtered = useMemo(() => {
    if (!query) return tickets;
    const q = query.toLowerCase();
    return tickets.filter((t) =>
      t.subject.toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q),
    );
  }, [tickets, query]);

  const submitReply = async () => {
    if (!active || !reply.trim() || busy) return;
    setBusy(true);
    try {
      await ticketApi.reply(active.id, reply.trim());
      setReply('');
      const r = await ticketApi.get(active.id);
      setActive(r.data);
      load();
    } finally { setBusy(false); }
  };

  const closeTicket = async () => {
    if (!active || busy) return;
    setBusy(true);
    try {
      await ticketApi.close(active.id);
      const r = await ticketApi.get(active.id);
      setActive(r.data);
      load();
    } finally { setBusy(false); }
  };

  return (
    <DashboardLayout>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support tickets</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Open a ticket from the help drawer (?) — replies arrive here and on your email.
          </p>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy size={28} />}
          title="No tickets yet"
          description="Click the (?) icon in the topbar and pick Contact support to open one."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          {/* List */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <ul className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
              {filtered.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(t.id)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      activeId === t.id ? 'bg-emerald-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${STATUS_COLORS[t.status] || STATUS_COLORS.OPEN}`}>
                        {t.status}
                      </span>
                      {t.category && (
                        <span className="text-[10px] text-slate-400 font-medium">{t.category}</span>
                      )}
                      <span className="ml-auto text-[10px] text-slate-400">{fmtRel(t.updatedAt)}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{t.subject}</h3>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Detail */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col min-h-[60vh]">
            {!active ? (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
                Select a ticket to view the thread
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-slate-900">{active.subject}</h2>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${STATUS_COLORS[active.status] || STATUS_COLORS.OPEN}`}>
                        {active.status}
                      </span>
                      {active.category && <span>{active.category}</span>}
                      <span>· Opened {fmtRel(active.createdAt)}</span>
                    </div>
                  </div>
                  {active.status !== 'CLOSED' && (
                    <Button variant="ghost" size="sm" onClick={closeTicket} disabled={busy}>
                      <XIcon size={13} /> Close
                    </Button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {(active.messages || []).map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.isStaff ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                          m.isStaff
                            ? 'bg-slate-100 text-slate-800 rounded-bl-sm'
                            : 'bg-emerald-500 text-white rounded-br-sm'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            m.isStaff ? 'text-slate-500' : 'text-white/80'
                          }`}>
                            {m.isStaff ? 'Support' : m.authorName}
                          </span>
                          <span className={`text-[10px] ${m.isStaff ? 'text-slate-400' : 'text-white/70'}`}>
                            {fmtRel(m.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {active.status !== 'CLOSED' ? (
                  <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
                    <div className="flex items-end gap-2">
                      <textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Type your reply…"
                        rows={2}
                        className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-400 resize-none bg-white"
                      />
                      <Button onClick={submitReply} disabled={!reply.trim() || busy}>
                        <Send size={14} />
                        {busy ? 'Sending…' : 'Reply'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
                    <Check size={12} /> This ticket is closed. Open a new one for follow-up issues.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
