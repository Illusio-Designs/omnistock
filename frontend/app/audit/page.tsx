'use client';

/**
 * Tenant-visible audit log.
 *
 * Backed by GET /billing/audit (filtered to req.tenant.id server-side, gated
 * by the `settings.read` permission). Shows every authenticated mutation
 * inside the tenant: who did it, when, what changed, from where.
 *
 * Uses the same visual language as /admin/audit but drops cross-tenant
 * fields and tenant filter.
 */

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { billingApi } from '@/lib/api';
import { Activity, RefreshCw, Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AuditRow {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  ip: string | null;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  metadata: unknown;
  createdAt: string;
}

const VERB_COLORS: Record<string, string> = {
  create:    'bg-emerald-100 text-emerald-700',
  update:    'bg-blue-100 text-blue-700',
  delete:    'bg-rose-100 text-rose-700',
  suspend:   'bg-amber-100 text-amber-700',
  activate:  'bg-emerald-100 text-emerald-700',
  sync:      'bg-violet-100 text-violet-700',
  connect:   'bg-emerald-100 text-emerald-700',
  pay:       'bg-emerald-100 text-emerald-700',
  reply:     'bg-blue-100 text-blue-700',
  close:     'bg-slate-200 text-slate-600',
  cancel:    'bg-rose-100 text-rose-700',
  enable:    'bg-emerald-100 text-emerald-700',
  disable:   'bg-rose-100 text-rose-700',
  topup:     'bg-emerald-100 text-emerald-700',
  reset:     'bg-blue-100 text-blue-700',
  export:    'bg-violet-100 text-violet-700',
};

const METHOD_COLORS: Record<string, string> = {
  POST:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  PUT:    'bg-blue-50 text-blue-700 border-blue-200',
  PATCH:  'bg-blue-50 text-blue-700 border-blue-200',
  DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
  GET:    'bg-slate-50 text-slate-600 border-slate-200',
};

function verbFor(action: string): string {
  const parts = action.split('.');
  return parts[parts.length - 1] || action;
}

function relTime(iso: string): string {
  const d = new Date(iso).getTime();
  const sec = Math.floor((Date.now() - d) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function TenantAuditPage() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [actions, setActions] = useState<Array<{ action: string; count: number }>>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async (filter = actionFilter) => {
    setLoading(true);
    try {
      const r = await billingApi.audit({ limit: 200, action: filter || undefined });
      setLogs(r.data?.logs || []);
      setActions(r.data?.actions || []);
      setTotal(Number(r.data?.total || 0));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(''); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    if (!search) return logs;
    const q = search.toLowerCase();
    return logs.filter((l) =>
      l.action.toLowerCase().includes(q) ||
      (l.userEmail || '').toLowerCase().includes(q) ||
      (l.path || '').toLowerCase().includes(q) ||
      (l.resourceId || '').toLowerCase().includes(q)
    );
  }, [logs, search]);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#06D4B8] to-[#06B6D4] bg-clip-text text-transparent flex items-center gap-2">
              <Activity size={24} className="text-emerald-600" /> Activity log
            </h1>
            <p className="text-slate-500 mt-1">
              Every change made inside your workspace — useful for security reviews and compliance.
              Limited to your tenant; older entries are paginated.
            </p>
          </div>
          <Button
            variant="secondary"
            leftIcon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={() => load()}
          >
            Refresh
          </Button>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total events</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{total.toLocaleString()}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Showing</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{filtered.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">most recent {actionFilter ? `· filter: ${actionFilter}` : ''}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Latest</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {logs[0] ? relTime(logs[0].createdAt) : '—'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 truncate">
              {logs[0]?.action || 'No activity yet'}
            </div>
          </div>
        </div>

        {/* Filter row */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search action, user, path, resource id…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); load(e.target.value); }}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
          >
            <option value="">All actions</option>
            {actions.map((a) => (
              <option key={a.action} value={a.action}>
                {a.action} ({a.count})
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              <Activity size={28} className="mx-auto mb-3 text-slate-300" />
              No audit entries match your filter.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left p-3 w-32">When</th>
                  <th className="text-left p-3">Action</th>
                  <th className="text-left p-3">User</th>
                  <th className="text-left p-3">Path</th>
                  <th className="text-center p-3 w-16">Status</th>
                  <th className="text-left p-3 w-32">IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const verb = verbFor(l.action);
                  const verbColor = VERB_COLORS[verb] || 'bg-slate-100 text-slate-600';
                  const methodColor = METHOD_COLORS[l.method || ''] || 'bg-slate-50 text-slate-600 border-slate-200';
                  const isOpen = expanded === l.id;
                  const meta = l.metadata && typeof l.metadata === 'object'
                    ? l.metadata
                    : (typeof l.metadata === 'string' ? safeParse(l.metadata) : null);
                  return (
                    <>
                      <tr
                        key={l.id}
                        onClick={() => setExpanded(isOpen ? null : l.id)}
                        className="border-t border-slate-100 hover:bg-slate-50/40 cursor-pointer"
                      >
                        <td className="p-3 text-xs text-slate-500 whitespace-nowrap">
                          <div className="font-semibold text-slate-700">{relTime(l.createdAt)}</div>
                          <div className="text-[10px] text-slate-400">{new Date(l.createdAt).toLocaleString()}</div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${verbColor}`}>
                              {verb}
                            </span>
                            <span className="font-mono text-xs text-slate-700">{l.action}</span>
                            <ChevronDown
                              size={12}
                              className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            />
                          </div>
                          {l.resourceId && (
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">#{l.resourceId.slice(0, 8)}</div>
                          )}
                        </td>
                        <td className="p-3 text-xs text-slate-700 truncate max-w-[200px]">{l.userEmail || '—'}</td>
                        <td className="p-3">
                          <div className="flex items-start gap-2">
                            {l.method && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${methodColor}`}>
                                {l.method}
                              </span>
                            )}
                            <span className="text-xs font-mono text-slate-600 truncate max-w-xs">{l.path}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {l.statusCode != null && (
                            <span className={`text-xs font-bold ${
                              l.statusCode >= 500 ? 'text-rose-600' :
                              l.statusCode >= 400 ? 'text-amber-600' :
                              l.statusCode >= 300 ? 'text-blue-600' :
                                                    'text-emerald-600'
                            }`}>
                              {l.statusCode}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-xs font-mono text-slate-500">{l.ip || '—'}</td>
                      </tr>
                      {isOpen && meta && (
                        <tr key={`${l.id}-meta`} className="bg-slate-50/60 border-t border-slate-100">
                          <td colSpan={6} className="p-3">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Metadata</div>
                            <pre className="text-[11px] font-mono text-slate-600 bg-white border border-slate-200 rounded-lg p-3 overflow-x-auto">
{JSON.stringify(meta, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-[11px] text-slate-400 mt-4">
          Showing up to 200 most recent entries for your tenant. Click any row to expand its metadata.
          For longer-range investigations, contact support.
        </p>
      </div>
    </DashboardLayout>
  );
}

function safeParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}
