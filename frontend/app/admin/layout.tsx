'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { Sidebar, type SidebarNavGroup } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import {
  LayoutDashboard, Package2, Building2, LifeBuoy, FileText, FileEdit,
  Search, Settings, Activity, Users, BarChart3,
} from 'lucide-react';

// Admin nav — same visual layout as the tenant sidebar, different items.
const ADMIN_NAV_GROUPS: SidebarNavGroup[] = [
  {
    label: 'Platform',
    items: [
      { label: 'Overview',       href: '/admin',            icon: LayoutDashboard },
      { label: 'Tenants',        href: '/admin/tenants',    icon: Building2 },
      { label: 'Subscriptions',  href: '/admin/plans',      icon: Package2 },
      { label: 'Tickets',        href: '/admin/tickets',    icon: LifeBuoy },
      { label: 'Analytics',      href: '/admin/analytics',  icon: BarChart3 },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Blog',           href: '/admin/blog',       icon: FileText },
      { label: 'Page Content',   href: '/admin/content',    icon: FileEdit },
      { label: 'SEO',            href: '/admin/seo',        icon: Search },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Audit Log',      href: '/admin/audit',      icon: Activity },
      { label: 'Settings',       href: '/admin/settings',   icon: Settings },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isPlatformAdmin } = useAuthStore();

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (!isPlatformAdmin()) { router.push('/dashboard'); }
  }, [user, isPlatformAdmin, router]);

  if (!user || !user.isPlatformAdmin) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        groups={ADMIN_NAV_GROUPS}
        brandName="Kartriq"
        brandSubtitle="Platform Admin"
        showUpgradeCard={false}
      />
      <main className="flex-1 flex flex-col min-w-0 w-full">
        <Topbar />
        {/* Admin pages supply their own inner padding */}
        <div className="flex-1 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
