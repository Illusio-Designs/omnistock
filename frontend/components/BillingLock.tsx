'use client';

/**
 * Hard lock that overlays the dashboard children when the tenant can't
 * legitimately use the product anymore:
 *   • TRIALING but currentPeriodEnd has passed
 *   • PAST_DUE   (auto-renew failed or trial rolled past-due)
 *   • EXPIRED    (sub fully lapsed after grace period)
 *   • tenant.status === 'SUSPENDED' / 'CANCELLED'
 *
 * Pass-through allowed for two paths so the user can actually fix the
 * problem:
 *   • /dashboard/billing   — pick plan, top up wallet, save card
 *   • /settings            — update email / phone, change password, 2FA
 *
 * The component refreshes /billing/usage every 5 minutes so a long-open
 * tab still locks itself when the cron flips status overnight.
 */

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { billingApi } from '@/lib/api';

const PASSTHROUGH_PREFIXES = ['/dashboard/billing', '/settings'];

interface SubLite {
  status?: string;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
}

export function BillingLock({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { subscription, tenant, user } = useAuthStore();
  const [fresh, setFresh] = useState<SubLite | null>(subscription || null);

  // Platform admins are not tenants — never lock them.
  const isPlatformAdmin = !!user?.isPlatformAdmin;

  // Pull a live copy so an open tab catches the cron's TRIALING→PAST_DUE
  // flip without requiring a full reload.
  useEffect(() => {
    if (isPlatformAdmin) return;
    let cancelled = false;
    const refresh = () => billingApi.usage()
      .then((r) => {
        if (cancelled) return;
        if (r.data?.subscription) setFresh(r.data.subscription);
      })
      .catch(() => { /* fail silent — fall back to whatever state we already have */ });
    refresh();
    const t = setInterval(refresh, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(t); };
  }, [isPlatformAdmin]);

  if (isPlatformAdmin) return <>{children}</>;

  const sub = fresh || subscription || {};
  const status = (sub as SubLite).status;
  const trialEnd = (sub as SubLite).trialEndsAt || (sub as SubLite).currentPeriodEnd;
  const trialExpired =
    status === 'TRIALING' && trialEnd && new Date(trialEnd).getTime() < Date.now();
  const pastDue = status === 'PAST_DUE';
  const expired = status === 'EXPIRED';
  const tenantStatus = tenant?.status;
  const suspended = tenantStatus === 'SUSPENDED' || tenantStatus === 'CANCELLED';

  const locked = trialExpired || pastDue || expired || suspended;
  if (!locked) return <>{children}</>;

  // Allow the user to fix the problem on these paths.
  if (PASSTHROUGH_PREFIXES.some((p) => pathname?.startsWith(p))) return <>{children}</>;

  // ── Lockscreen ───────────────────────────────────────────────────────
  let title = 'Your account is locked';
  let body = 'Add a payment method to continue using your workspace.';
  let cta = 'Choose a plan';

  if (trialExpired) {
    title = 'Your free trial has ended';
    body = 'Pick a plan and add a payment method to keep using Kartriq. Your data is safe — adding a plan unlocks everything immediately.';
    cta = 'Choose a plan';
  } else if (pastDue) {
    title = 'Payment past due';
    body = "We couldn't charge your last invoice. Update your payment method to restore access — your data is intact.";
    cta = 'Update payment method';
  } else if (expired) {
    title = 'Subscription expired';
    body = 'Your subscription lapsed beyond the grace period. Reactivate to regain access.';
    cta = 'Reactivate subscription';
  } else if (suspended) {
    title = tenantStatus === 'CANCELLED' ? 'Account cancelled' : 'Account suspended';
    body = 'Contact support if you believe this is an error, or reactivate to continue.';
    cta = 'Contact billing';
  }

  return (
    <div className="flex-1 px-6 py-12 flex items-start sm:items-center justify-center">
      <div className="max-w-lg w-full text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-900/5 dark:shadow-black/20">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-5">
          <Lock size={26} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">{body}</p>

        <Link
          href="/dashboard/billing"
          className="mt-7 inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-full shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all"
        >
          {cta} <ArrowRight size={14} />
        </Link>

        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <p>Need help? <a href="mailto:support@kartriq.com" className="font-semibold text-emerald-700 dark:text-emerald-300 hover:underline">support@kartriq.com</a></p>
          <p className="text-slate-400 dark:text-slate-500">Your data isn&apos;t deleted — paying re-opens the workspace exactly as you left it.</p>
        </div>
      </div>
    </div>
  );
}
