'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Power, PowerOff, Crown, Search, LayoutDashboard } from 'lucide-react';

export default function AdminTenantsPage() {
  const router = useRouter();
  const { startImpersonation } = useAuthStore();
  const [tenants, setTenants] = useState<any[]>([]);
  const [search, setSearch] = useState('');
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

  const load = () => adminApi.tenants(search ? { search } : undefined).then((r) => setTenants(r.data));
  useEffect(() => { load(); adminApi.plans().then((r) => setPlans(r.data)); }, []);

  const suspend = async (id: string) => { await adminApi.suspendTenant(id); load(); };
  const activate = async (id: string) => { await adminApi.activateTenant(id); load(); };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-900">Tenants</h1>
      <p className="text-slate-500 mt-1">All businesses signed up to OmniStock.</p>

      <div className="flex items-center gap-2 mt-6 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Search business name…"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200"
          />
        </div>
        <button onClick={load} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm">Search</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
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
            {tenants.map((t: any) => (
              <tr key={t.id} className="border-t border-slate-100">
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
                  <button onClick={() => openAsTenant(t)} title="Open dashboard as this tenant" className="text-emerald-600">
                    <LayoutDashboard size={14} />
                  </button>
                  <button onClick={() => setAssigning(t)} title="Assign plan" className="text-amber-600">
                    <Crown size={14} />
                  </button>
                  {t.status === 'SUSPENDED'
                    ? <button onClick={() => activate(t.id)} className="text-emerald-600"><Power size={14} /></button>
                    : <button onClick={() => suspend(t.id)} className="text-red-600"><PowerOff size={14} /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {assigning && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md">
            <h3 className="text-lg font-bold mb-3">Assign plan to {assigning.businessName}</h3>
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
            <button onClick={() => setAssigning(null)} className="mt-4 w-full py-2 text-slate-500">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
