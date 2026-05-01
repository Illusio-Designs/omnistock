'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useSearchStore } from '@/store/search.store';
import { Power, PowerOff, Crown, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { Modal } from '@/components/ui/Modal';

export default function AdminTenantsPage() {
  const router = useRouter();
  const { startImpersonation } = useAuthStore();
  const query = useSearchStore((s) => s.query);
  const [tenants, setTenants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [assigning, setAssigning] = useState<any>(null);

  const openAsTenant = (t: any) => {
    startImpersonation({
      id: t.id,
      slug: t.slug,
      status: t.status,
      businessName: t.businessName,
    });
    router.push('/dashboard');
  };

  const load = () => adminApi.tenants(query ? { search: query } : undefined).then((r) => setTenants(r.data));
  useEffect(() => { load(); }, [query]);
  useEffect(() => { adminApi.plans().then((r) => setPlans(r.data)); }, []);

  const suspend = async (id: string) => { await adminApi.suspendTenant(id); load(); };
  const activate = async (id: string) => { await adminApi.activateTenant(id); load(); };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-[#06D4B8] to-[#06B6D4] bg-clip-text text-transparent">
        Tenants
      </h1>
      <p className="text-slate-500 mt-1">All businesses signed up to Omnistock.</p>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mt-6">
        <table className="w-full text-sm">
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
                    'bg-red-100 text-red-700'
                  }`}>{t.status}</span>
                </td>
                <td className="p-3 text-right">{t._count?.users || 0}</td>
                <td className="p-3 text-right">{t._count?.orders || 0}</td>
                <td className="p-3 text-right">{t._count?.products || 0}</td>
                <td className="p-3 flex gap-2 justify-end">
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
                  {t.status === 'SUSPENDED' ? (
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
