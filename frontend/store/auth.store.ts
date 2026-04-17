import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId?: string | null;
  isPlatformAdmin?: boolean;
  avatar?: string | null;
}

interface Tenant {
  id: string;
  slug: string;
  status: string;
  businessName: string;
}

interface Plan {
  id: string;
  code: string;
  name: string;
  maxFacilities: number | null;
  maxSkus: number | null;
  maxUserRoles: number | null;
  maxUsers: number | null;
  maxOrdersPerMonth: number | null;
  features: Record<string, any>;
}

interface Subscription {
  id: string;
  status: string;
  payAsYouGo: boolean;
  currentPeriodEnd: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  tenant: Tenant | null;
  plan: Plan | null;
  subscription: Subscription | null;
  permissions: string[];
  impersonatingTenant: Tenant | null;
  setAuth: (user: User, token: string) => void;
  setContext: (data: { tenant?: Tenant | null; plan?: Plan | null; subscription?: Subscription | null; permissions?: string[] }) => void;
  startImpersonation: (tenant: Tenant) => void;
  stopImpersonation: () => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  hasPermission: (...codes: string[]) => boolean;
  hasFeature: (flag: string) => boolean;
  isPlatformAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      tenant: null,
      plan: null,
      subscription: null,
      permissions: [],
      impersonatingTenant: null,
      setAuth: (user, token) => {
        localStorage.setItem('token', token);
        set({ user, token });
      },
      setContext: ({ tenant, plan, subscription, permissions }) =>
        set((s) => ({
          tenant: tenant ?? s.tenant,
          plan: plan ?? s.plan,
          subscription: subscription ?? s.subscription,
          permissions: permissions ?? s.permissions,
        })),
      startImpersonation: (tenant) => {
        localStorage.setItem('impersonate-tenant', tenant.id);
        set({ impersonatingTenant: tenant });
      },
      stopImpersonation: () => {
        localStorage.removeItem('impersonate-tenant');
        set({ impersonatingTenant: null });
      },
      logout: () => {
        // Invalidate server-side permission cache; ignore network errors
        authApi.logout().catch(() => {});
        localStorage.removeItem('token');
        localStorage.removeItem('impersonate-tenant');
        set({ user: null, token: null, tenant: null, plan: null, subscription: null, permissions: [], impersonatingTenant: null });
      },
      isAuthenticated: () => !!get().token,
      hasPermission: (...codes) => {
        const { permissions, user } = get();
        if (user?.isPlatformAdmin) return true;
        if (permissions.includes('*')) return true;
        return codes.some((c) => permissions.includes(c));
      },
      hasFeature: (flag) => {
        const { plan, user } = get();
        if (user?.isPlatformAdmin) return true;
        return !!plan?.features?.[flag];
      },
      isPlatformAdmin: () => !!get().user?.isPlatformAdmin,
    }),
    { name: 'omnistock-auth' }
  )
);
