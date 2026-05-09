'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useSearchStore } from '@/store/search.store';
import { Power, PowerOff, Crown, LayoutDashboard, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui';
import { toast } from '@/store/toast.store';

const STATUSES = ['ACTIVE', 'TRIAL', 'PAST_DUE', 'SUSPENDED', 'CANCELLED', 'DELETED'] as const;
type StatusFilter = '' | typeof STATUSES[number];

// Recovery window — must match backend `billing.softDeleteDays`
// (default 30) so admins can read the same number we enforce.
const SOFT_DELETE_DAYS = 30;

function daysSince(iso?: string | null) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

export default function AdminTenantsPage() {
  const router = useRouter();
  const { startImpersonation } = useAuthStore();
  const query = useSearchStore((s) => s.query);
  const [tenants, setTenants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [assigning, setAssigning] = useState<any>(null);
  const [filter, setFilter] = useState<StatusFilter>('');
  const [restoring, setRestoring] = useState<string | null>(null);

  const openAsTenant = (t: any) => {
    startImpersonation({
      id: t.id,
      slug: t.slug,
      status: t.status,
      businessName: t.businessName,
    });
    router.push('/dashboard');
  };

  const load = () => adminApi.tenants({
    ...(query ? { search: query } : {}),
    ...(filter ? { status: filter } : {}),
  }).then((r) => setTenants(r.data));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [query, filter]);
  useEffect(() => { adminApi.plans().then((r) => setPlans(r.data)); }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: tenants.length };
    for (const s of STATUSES) c[s] = 0;
    for (const t of tenants) if (c[t.status] !== undefined) c[t.status] += 1;
    return c;
  }, [tenants]);

  const suspend = async (id: string) => { await adminApi.suspendTenant(id); load(); };
  const activate = async (id: string) => { await adminApi.activateTenant(id); load(); };

  const restore = async (t: any) => {
    setRestoring(t.id);
    try {
      const r = await adminApi.restoreTenant(t.id);
      if (r.data?.warning) toast.warning(r.data.warning);
      else toast.success(`${t.businessName} restored.`);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Restore failed');
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-[#06D4B8] to-[#06B6D4] bg-clip-text text-transparent">
        Tenants
      </h1>
      <p className="text-slate-500 mt-1">All businesses signed up to Kartriq.</p>

      {/* Status filter — includes DELETED so admins can find self-deleted
          tenants and restore them within the {SOFT_DELETE_DAYS}-day window. */}
      <div className="mt-5">
        <Tabs
          size="sm"
          value={filter}
          onChange={(k) => setFilter(k as StatusFilter)}
          items={[
            { key: '',          label: 'All',       badge: counts.ALL || undefined },
            { key: 'ACTIVE',    label: 'Active',    badge: counts.ACTIVE || undefined },
            { key: 'TRIAL',     label: 'Trial',     badge: counts.TRIAL || undefined },
            { key: 'PAST_DUE',  label: 'Past due',  badge: counts.PAST_DUE || undefined },
            { key: 'SUSPENDED', label: 'Suspended', badge: counts.SUSPENDED || undefined },
            { key: 'CANCELLED', label: 'Cancelled', badge: counts.CANCELLED || undefined },
            { key: 'DELETED',   label: 'Deleted',   badge: counts.DELETED || undefined },
          ]}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="text-left p-3">#</th>
              <th className="text-left p-3">Business</th>
              <th className="text-left p-3">Plan</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Users</th>
              <th className="text-right p-3">Orders</th>
              <th className="text-right p-3">Products</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t: any, idx: number) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="p-3 text-slate-500 font-semibold">{idx + 1}</td>
                <td className="p-3">
                  <div className="font-semibold">{t.businessName}</div>
                  <div className="text-xs text-slate-500">{t.ownerEmail}</div>
                </td>
                <td className="p-3">
                  <div className="font-semibold">{t.subscription?.plan?.name || '—'}</div>
                  <div className="text-xs text-slate-500">{t.subscription?.status}</div>
                </td>
                <td className="p-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    t.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                    t.status === 'TRIAL' ? 'bg-blue-100 text-blue-700' :
                    t.status === 'DELETED' ? 'bg-slate-200 text-slate-700' :
                    'bg-red-100 text-red-700'
                  }`}>{t.status}</span>
                  {t.status === 'DELETED' && t.deletedAt && (() => {
                    const d = daysSince(t.deletedAt);
                    if (d === null) return null;
                    const remaining = SOFT_DELETE_DAYS - d;
                    return (
                      <div className={`mt-1 text-[10px] font-medium ${
                        remaining <= 0
                          ? 'text-rose-600'
                          : remaining <= 7
                            ? 'text-amber-700'
                            : 'text-slate-500'
                      }`}>
                        {remaining <= 0
                          ? 'PII purged · only data shell remains'
                          : `Restorable for ${remaining}d (deleted ${d}d ago)`}
                      </div>
                    );
                  })()}
                </td>
                <td className="p-3 text-right">{t._count?.users || 0}</td>
                <td className="p-3 text-right">{t._count?.orders || 0}</td>
                <td className="p-3 text-right">{t._count?.products || 0}</td>
                <td className="p-3 flex gap-2 justify-end">
                  {t.status !== 'DELETED' && (
                    <>
                      <Tooltip content="Open dashboard as this tenant">
                        <Button variant="ghost" size="icon" onClick={() => openAsTenant(t)}>
                          <LayoutDashboard size={14} />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Assign plan">
                        <Button variant="ghost" size="icon" onClick={() => setAssigning(t)}>
                          <Crown size={14} />
                        </Button>
                      </Tooltip>
                    </>
                  )}
                  {t.status === 'DELETED' ? (
                    <Tooltip content="Restore this tenant — re-enables login and all team access">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => restore(t)}
                        loading={restoring === t.id}
                        leftIcon={<RotateCcw size={13} />}
                      >
                        Restore
                      </Button>
                    </Tooltip>
                  ) : t.status === 'SUSPENDED' ? (
                    <Tooltip content="Activate tenant">
                      <Button variant="ghost" size="icon" onClick={() => activate(t.id)}>
                        <Power size={14} />
                      </Button>
                    </Tooltip>
                  ) : (
                    <Tooltip content="Suspend tenant">
                      <Button variant="danger" size="icon" onClick={() => suspend(t.id)}>
                        <PowerOff size={14} />
                      </Button>
                    </Tooltip>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!assigning}
        onClose={() => setAssigning(null)}
        title={assigning ? `Assign plan to ${assigning.businessName}` : 'Assign plan'}
        size="md"
        footer={<Button variant="secondary" onClick={() => setAssigning(null)}>Cancel</Button>}
      >
        <div className="space-y-2">
          {plans.map((p) => (
            <button
              key={p.id}
              onClick={async () => {
                await adminApi.assignPlan(assigning.id, { planCode: p.code, billingCycle: 'MONTHLY' });
                setAssigning(null); load();
              }}
              className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-500"
            >
              <div className="font-bold">{p.name}</div>
              <div className="text-xs text-slate-500">₹{Number(p.monthlyPrice).toLocaleString()}/mo</div>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
