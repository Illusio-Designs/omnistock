'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { useSearchStore } from '@/store/search.store';
import { LifeBuoy, Filter } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  OPEN:     'bg-rose-100 text-rose-700',
  PENDING:  'bg-amber-100 text-amber-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED:   'bg-slate-200 text-slate-600',
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('');
  const query = useSearchStore((s) => s.query);

  const load = () => adminApi.tickets(filter ? { status: filter } : undefined).then((r) => setTickets(r.data));
  useEffect(() => { load(); }, [filter]);

  const filtered = tickets.filter((t) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      t.subject.toLowerCase().includes(q) ||
      t.tenant?.businessName?.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <LifeBuoy size={24} className="text-emerald-600" /> Support tickets
          </h1>
          <p className="text-slate-500 mt-1">All open and closed tickets across every tenant.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100">
          {['', 'OPEN', 'PENDING', 'RESOLVED', 'CLOSED'].map((s) => (
            <button
              key={s || 'ALL'}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold ${
                filter === s ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <LifeBuoy size={28} className="mx-auto mb-3 text-slate-300" />
            No tickets match your filter.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left p-3">#</th>
                <th className="text-left p-3">Subject</th>
                <th className="text-left p-3">Tenant</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Priority</th>
                <th className="text-right p-3">Messages</th>
                <th className="text-right p-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t: any, idx: number) => (
                <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3 text-slate-500 font-semibold">{idx + 1}</td>
                  <td className="p-3">
                    <Link href={`/admin/tickets/${t.id}`} className="font-semibold text-slate-900 hover:text-emerald-700">
                      {t.subject}
                    </Link>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">#{t.id.slice(0, 8)}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold">{t.tenant?.businessName || '—'}</div>
                    <div className="text-xs text-slate-500">{t.tenant?.slug}</div>
                  </td>
                  <td className="p-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${STATUS_COLORS[t.status]}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs font-semibold text-slate-600">{t.priority}</td>
                  <td className="p-3 text-right">{t._count?.messages || 0}</td>
                  <td className="p-3 text-right text-xs text-slate-500">{new Date(t.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
