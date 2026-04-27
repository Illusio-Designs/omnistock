'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Activity, Search, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';

interface AuditRow {
  id: string;
  tenantId: string | null;
  userId: string | null;
  userEmail: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  ip: string | null;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  metadata: any;
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

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 200 };
      if (actionFilter) params.action = actionFilter;
      if (tenantFilter) params.tenantId = tenantFilter;
      const r = await adminApi.audit(params);
      setLogs(r.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    if (!query) return logs;
    const q = query.toLowerCase();
    return logs.filter((l) =>
      l.action.toLowerCase().includes(q) ||
      (l.userEmail || '').toLowerCase().includes(q) ||
      (l.path || '').toLowerCase().includes(q) ||
      (l.resourceId || '').toLowerCase().includes(q)
    );
  }, [logs, query]);

  return (
    <div className="p-8">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Activity size={24} className="text-emerald-600" /> Audit Log
          </h1>
          <p className="text-slate-500 mt-1">
            Every authenticated mutation across every tenant. Auto-captured by the autoAudit middleware.
          </p>
        </div>
        <Button
          variant="secondary"
          leftIcon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
          onClick={load}
        >
          Refresh
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <Input
            leftIcon={<Search size={14} />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search action, email, path, resource id…"
          />
        </div>
        <Input
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Action filter (e.g. orders.create)"
        />
        <Input
          value={tenantFilter}
          onChange={(e) => setTenantFilter(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Tenant ID"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <Loader />
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <Activity size={28} className="mx-auto mb-3 text-slate-300" />
            No audit entries match your filter.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 sticky top-0">
              <tr>
                <th className="text-left p-3">#</th>
                <th className="text-left p-3">When</th>
                <th className="text-left p-3">Action</th>
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Path</th>
                <th className="text-center p-3">Status</th>
                <th className="text-left p-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, idx) => {
                const verb = verbFor(l.action);
                const verbColor = VERB_COLORS[verb] || 'bg-slate-100 text-slate-600';
                const methodColor = METHOD_COLORS[l.method || ''] || 'bg-slate-50 text-slate-600 border-slate-200';
                return (
                  <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50/40">
                    <td className="p-3 text-xs text-slate-500 font-semibold">{idx + 1}</td>
                    <td className="p-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${verbColor}`}>
                          {verb}
                        </span>
                        <span className="font-mono text-xs text-slate-700">{l.action}</span>
                      </div>
                      {l.resourceId && (
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">#{l.resourceId.slice(0, 8)}</div>
                      )}
                    </td>
                    <td className="p-3 text-xs">
                      <div className="font-semibold text-slate-700">{l.userEmail || '—'}</div>
                      {l.tenantId && (
                        <div className="text-[10px] font-mono text-slate-400">tenant: {l.tenantId.slice(0, 8)}</div>
                      )}
                    </td>
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
                      {l.statusCode && (
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
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[11px] text-slate-400 mt-4">
        Showing up to 200 most recent entries. Set filters above to narrow the query.
      </p>
    </div>
  );
}
