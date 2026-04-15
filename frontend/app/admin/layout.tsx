'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { LayoutDashboard, Package2, Building2, FileText, Search, LogOut, Crown, Settings, FileEdit, LifeBuoy } from 'lucide-react';

const NAV = [
  { href: '/admin',          label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/plans',    label: 'Plans',    icon: Package2 },
  { href: '/admin/tenants',  label: 'Tenants',  icon: Building2 },
  { href: '/admin/tickets',  label: 'Tickets',  icon: LifeBuoy },
  { href: '/admin/blog',     label: 'Blog',     icon: FileText },
  { href: '/admin/content',  label: 'Content',  icon: FileEdit },
  { href: '/admin/seo',      label: 'SEO',      icon: Search },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isPlatformAdmin, logout } = useAuthStore();

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (!isPlatformAdmin()) { router.push('/dashboard'); }
  }, [user, isPlatformAdmin, router]);

  if (!user || !user.isPlatformAdmin) return null;

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Crown size={20} className="text-amber-400" />
            <div>
              <div className="font-bold">Platform Admin</div>
              <div className="text-xs text-white/60">SaaS Console</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-emerald-500 text-white' : 'text-white/80 hover:bg-white/10'
                }`}>
                <Icon size={16} /> {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="text-xs text-white/60 px-3 mb-2">{user.email}</div>
          <button onClick={() => { logout(); router.push('/login'); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-white/10">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
