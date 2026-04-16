'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuthStore } from '@/store/auth.store';
import { MaintenancePage } from '@/components/MaintenancePage';
import { Eye, X, ArrowLeft } from 'lucide-react';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { impersonatingTenant, stopImpersonation, isPlatformAdmin } = useAuthStore();
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message: string; eta: string } | null>(null);

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    fetch(`${api}/public/maintenance`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setMaintenance(data); })
      .catch(() => {});
  }, []);

  // Show maintenance page for non-admin users
  if (maintenance?.enabled && !isPlatformAdmin()) {
    return <MaintenancePage message={maintenance.message} eta={maintenance.eta} />;
  }

  const exitImpersonation = () => {
    stopImpersonation();
    router.push('/admin/tenants');
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 w-full">
        {impersonatingTenant && (
          <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-white px-4 py-2.5 flex items-center justify-between text-sm font-semibold shadow">
            <div className="flex items-center gap-2">
              <Eye size={14} />
              Viewing as tenant: <span className="font-bold">{impersonatingTenant.businessName}</span>
              <span className="text-white/70 text-xs">({impersonatingTenant.slug})</span>
            </div>
            <button
              onClick={exitImpersonation}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold"
            >
              <ArrowLeft size={12} /> Exit to Platform Admin
            </button>
          </div>
        )}
        {isPlatformAdmin() && !impersonatingTenant && (
          <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between text-xs">
            <span>Platform admin viewing global dashboard</span>
            <Link href="/admin" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 font-bold">
              Back to Admin
            </Link>
          </div>
        )}
        {maintenance?.enabled && isPlatformAdmin() && (
          <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Maintenance mode is ON — only admins can access the dashboard
          </div>
        )}
        <Topbar />
        <div className="flex-1 p-4 sm:p-5 lg:p-6 xl:p-8 animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
