import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';

// DEV-ONLY: set to true to bypass login with a mock session
const DEV_BYPASS_LOGIN = false;

export default function Index() {
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setContext = useAuthStore((s) => s.setContext);

  useEffect(() => {
    if (DEV_BYPASS_LOGIN && !token) {
      setAuth(
        {
          id: 'dev-user-001',
          name: 'Dev User',
          email: 'dev@omnistock.local',
          role: 'owner',
          tenantId: 'dev-tenant-001',
          isPlatformAdmin: true,
        },
        'dev-bypass-token'
      ).then(() => {
        setContext({
          tenant: {
            id: 'dev-tenant-001',
            slug: 'dev-store',
            status: 'active',
            businessName: 'Dev Store',
          },
          plan: {
            id: 'plan-001',
            code: 'pro',
            name: 'Pro',
            maxFacilities: null,
            maxSkus: null,
            maxUserRoles: null,
            maxUsers: null,
            maxOrdersPerMonth: null,
            features: { analytics: true, multiWarehouse: true },
          },
          subscription: {
            id: 'sub-001',
            status: 'active',
            payAsYouGo: false,
            currentPeriodEnd: '2027-01-01',
          },
          permissions: ['*'],
        });
      });
    }
  }, []);

  if (!token && !DEV_BYPASS_LOGIN) return <Redirect href="/login" />;
  if (!token) return null; // wait for mock auth to hydrate
  return <Redirect href="/dashboard" />;
}
