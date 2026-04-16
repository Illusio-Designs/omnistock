import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

export default function Index() {
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setContext = useAuthStore((s) => s.setContext);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecked(true);
      return;
    }
    // Validate the token and refresh full user + tenant context
    authApi
      .me()
      .then(({ data }) => {
        // Update user in store (may have new tenantId, role, etc.)
        setAuth(
          {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            tenantId: data.tenantId ?? null,
            isPlatformAdmin: !!data.isPlatformAdmin,
            avatar: data.avatar ?? null,
          },
          token
        );
        // Hydrate tenant, plan, subscription, permissions
        setContext({
          tenant: data.tenant ?? null,
          plan: data.plan ?? null,
          subscription: data.subscription ?? null,
          permissions: data.permissions ?? [],
        });
        setChecked(true);
      })
      .catch(async () => {
        await logout();
        setChecked(true);
      });
  }, []);

  if (!checked) return null;
  if (!token) return <Redirect href="/login" />;
  return <Redirect href="/dashboard" />;
}
