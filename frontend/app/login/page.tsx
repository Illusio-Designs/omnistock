'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import { Sparkles, ArrowRight, Shield, Crown, Briefcase, Users, Calculator, AlertCircle } from 'lucide-react';

type SeedRole = {
  key: string;
  label: string;
  desc: string;
  icon: any;
  email: string;
  redirect: string;
};

// Maps to users created in backend/prisma/seed.js
const ROLES: SeedRole[] = [
  { key: 'PLATFORM_ADMIN', label: 'Platform Admin', desc: 'SaaS founder — full platform',  icon: Shield,     email: 'founder@omnistock.com',    redirect: '/admin'     },
  { key: 'ADMIN',          label: 'Tenant Admin',   desc: 'Demo tenant owner',              icon: Crown,      email: 'admin@omnistock.com',      redirect: '/dashboard' },
  { key: 'MANAGER',        label: 'Manager',        desc: 'Operations & fulfillment',       icon: Briefcase,  email: 'manager@omnistock.com',    redirect: '/dashboard' },
  { key: 'STAFF',          label: 'Staff',          desc: 'Read + fulfill orders',          icon: Users,      email: 'staff@omnistock.com',      redirect: '/dashboard' },
  { key: 'ACCOUNTANT',     label: 'Accountant',     desc: 'Invoices, reports, billing',     icon: Calculator, email: 'accountant@omnistock.com', redirect: '/dashboard' },
];

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, setContext } = useAuthStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const enterAs = async (r: SeedRole) => {
    setError('');
    setLoading(r.key);
    try {
      // Dev-bypass token format understood by backend auth.middleware.js
      const token = `dev:${r.email}`;
      // Seed a minimal user in the store so the axios interceptor sends the token.
      setAuth(
        {
          id: `dev-${r.key.toLowerCase()}`,
          name: r.label,
          email: r.email,
          role: r.key === 'PLATFORM_ADMIN' ? 'SUPER_ADMIN' : r.key,
          tenantId: null,
          isPlatformAdmin: r.key === 'PLATFORM_ADMIN',
          avatar: null,
        },
        token
      );
      // Let the backend populate real tenant/plan/permissions from seed data.
      const me = await authApi.me();
      setAuth(
        {
          id: me.data.id,
          name: me.data.name,
          email: me.data.email,
          role: me.data.role,
          tenantId: me.data.tenantId,
          isPlatformAdmin: !!me.data.isPlatformAdmin,
          avatar: me.data.avatar ?? null,
        },
        token
      );
      setContext({
        tenant: me.data.tenant,
        plan: me.data.plan,
        subscription: me.data.subscription,
        permissions: me.data.permissions || [],
      });
      router.push(me.data.isPlatformAdmin ? '/admin' : r.redirect);
    } catch (err: any) {
      setError(err.response?.data?.error || `Could not load ${r.email}. Did you run the seed?`);
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Sparkles size={17} className="text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900">OmniStock</span>
          </Link>

          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pick a role</h1>
          <p className="text-sm text-slate-500 mt-1">Dev mode — signs in as the matching seeded user</p>

          {error && (
            <div className="mt-6 flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-6 space-y-2.5">
            {ROLES.map((r) => {
              const Icon = r.icon;
              const isLoading = loading === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  disabled={loading !== null}
                  onClick={() => enterAs(r)}
                  className="group w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition text-left disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-sm">
                    <Icon size={17} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900">{r.label}</div>
                    <div className="text-xs text-slate-500 truncate">{r.email} · {r.desc}</div>
                  </div>
                  <ArrowRight size={16} className={`text-slate-400 group-hover:text-emerald-600 transition ${isLoading ? 'animate-pulse' : ''}`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/10 blur-3xl -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full bg-emerald-300/20 blur-3xl translate-y-1/2" />

        <div className="relative flex flex-col justify-between p-12 text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-bold uppercase tracking-wider w-fit">
            <Sparkles size={12} /> Everything Commerce
          </div>

          <div>
            <h2 className="text-4xl xl:text-5xl font-bold tracking-tight leading-tight">
              One platform<br />
              for every channel.
            </h2>
            <p className="mt-4 text-white/80 text-base max-w-md leading-relaxed">
              Amazon, Flipkart, Blinkit, Shopify & 50+ more — manage orders, inventory, shipping, and reviews in one beautiful dashboard.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { value: '50+',  label: 'Channels' },
              { value: '500K', label: 'Orders/mo' },
              { value: '99.9%', label: 'Uptime' },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-[10px] font-bold text-white/70 uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
