'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Building2, Users, ShoppingBag, Activity, Sparkles } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';

export default function AdminOverview() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => { adminApi.stats().then((r) => setStats(r.data)).catch(() => {}); }, []);
  if (!stats) return <div className="p-8"><Loader /></div>;

  const cards = [
    { label: 'Tenants',       value: stats.tenants,    icon: Building2,  color: 'emerald' },
    { label: 'Active subs',   value: stats.activeSubs, icon: Sparkles,   color: 'blue' },
    { label: 'Trialing',      value: stats.trialing,   icon: Activity,   color: 'amber' },
    { label: 'Total users',   value: stats.totalUsers, icon: Users,      color: 'purple' },
    { label: 'Total orders',  value: stats.totalOrders,icon: ShoppingBag,color: 'pink' },
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-900">Platform Overview</h1>
      <p className="text-slate-500 mt-1">SaaS-wide metrics across all tenants.</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
        {cards.map((c) => (
          <div key={c.label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-500 uppercase">{c.label}</div>
              <c.icon size={18} className="text-slate-400" />
            </div>
            <div className="text-3xl font-bold text-slate-900 mt-2">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
