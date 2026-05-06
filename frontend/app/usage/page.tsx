'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { billingApi } from '@/lib/api';
import {
  Package, Users, Building2, ShoppingBag, Plug, Activity, Wallet, ArrowUpRight,
} from 'lucide-react';

type Usage = {
  period: string;
  plan: any;
  subscription: {
    status: string;
    payAsYouGo: boolean;
    autoRenew: boolean;
    billingCycle: string;
    currentPeriodEnd: string;
    trialEndsAt: string | null;
  };
  wallet: { balance: number; currency: string } | null;
  used: { facilities: number; skus: number; users: number; channels: number; ordersThisPeriod: number };
  limits: { facilities: number | null; skus: number | null; users: number | null; ordersPerMonth: number | null; channels: number | null };
  rates: Record<string, number>;
  overage: Record<string, number>;
  totalOverageCost: number;
};

const METRICS: Array<{
  key: keyof Usage['used'];
  limitKey: keyof Usage['limits'];
  rateKey: string;
  label: string;
  icon: any;
  color: string;
}> = [
  { key: 'skus',             limitKey: 'skus',           rateKey: 'extraSkus',    label: 'Products (SKUs)', icon: Package,    color: 'emerald' },
  { key: 'ordersThisPeriod', limitKey: 'ordersPerMonth', rateKey: 'extraOrders',  label: 'Orders this month', icon: ShoppingBag, color: 'blue' },
  { key: 'users',            limitKey: 'users',          rateKey: 'extraUsers',   label: 'Team members',    icon: Users,      color: 'violet' },
  { key: 'channels',         limitKey: 'channels',       rateKey: 'extraChannels',label: 'Connected channels', icon: Plug,    color: 'amber' },
  { key: 'facilities',       limitKey: 'facilities',     rateKey: 'extraFacilities', label: 'Warehouses',   icon: Building2,  color: 'pink' },
];

export default function UsagePage() {
  const [data, setData] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    billingApi.usage()
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#06D4B8] to-[#06B6D4] bg-clip-text text-transparent">
              Usage &amp; Limits
            </h1>
            <p className="text-slate-500 mt-1">
              Track how much of your plan you&apos;ve used this billing period.
              Numbers update in real time.
            </p>
          </div>
          <Link
            href="/dashboard/billing"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-md shadow-emerald-500/20"
          >
            Manage plan <ArrowUpRight size={12} />
          </Link>
        </div>

        {/* Plan summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading ? (
            <>
              <div className="h-24 bg-white border border-slate-200 rounded-2xl animate-pulse" />
              <div className="h-24 bg-white border border-slate-200 rounded-2xl animate-pulse" />
              <div className="h-24 bg-white border border-slate-200 rounded-2xl animate-pulse" />
            </>
          ) : data ? (
            <>
              <SummaryCard
                label="Current plan"
                value={data.plan?.name || '—'}
                hint={`${data.subscription.billingCycle} · ${data.subscription.status}`}
              />
              <SummaryCard
                label="Period"
                value={data.period}
                hint={`Renews ${new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}`}
              />
              <SummaryCard
                label={data.subscription.payAsYouGo ? 'PAYG wallet' : 'Pay-As-You-Go'}
                value={data.wallet ? `${data.wallet.currency} ${data.wallet.balance.toFixed(2)}` : 'Disabled'}
                hint={data.subscription.payAsYouGo
                  ? 'Used for overage charges'
                  : 'Toggle on to allow usage past plan limits'}
                icon={Wallet}
              />
            </>
          ) : (
            <div className="md:col-span-3 text-sm text-slate-500 text-center py-12 bg-white rounded-2xl border border-slate-200">
              Could not load usage. Try refreshing.
            </div>
          )}
        </div>

        {/* Per-metric usage bars */}
        <div className="mt-8 space-y-3">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 bg-white border border-slate-200 rounded-2xl animate-pulse" />
              ))
            : data && METRICS.map((m) => (
                <UsageRow
                  key={m.key}
                  used={data.used[m.key] || 0}
                  limit={data.limits[m.limitKey]}
                  rate={Number(data.rates?.[m.rateKey] || 0)}
                  overage={data.overage?.[m.key === 'ordersThisPeriod' ? 'orders' : m.key as string] || 0}
                  payAsYouGo={data.subscription.payAsYouGo}
                  label={m.label}
                  icon={m.icon}
                  color={m.color}
                />
              ))}
        </div>

        {/* Overage summary */}
        {data && data.totalOverageCost > 0 && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
            <Activity className="text-amber-700 flex-shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <h3 className="font-bold text-amber-900">Overage this period</h3>
              <p className="text-sm text-amber-800 mt-1">
                You&apos;ve used more than your plan limit on one or more metrics. Total overage charges so far:{' '}
                <strong>₹{data.totalOverageCost.toFixed(2)}</strong>.
                {data.subscription.payAsYouGo
                  ? ' These will be deducted from your wallet.'
                  : ' Enable Pay-As-You-Go on the billing page to keep working.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ───────────────────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, hint, icon: Icon,
}: { label: string; value: string; hint?: string; icon?: any }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</div>
        {Icon && <Icon size={14} className="text-slate-400" />}
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}

function UsageRow({
  used, limit, rate, overage, payAsYouGo, label, icon: Icon, color,
}: {
  used: number; limit: number | null; rate: number; overage: number;
  payAsYouGo: boolean; label: string; icon: any; color: string;
}) {
  const isUnlimited = limit === null || limit === undefined;
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const overLimit = !isUnlimited && used > (limit as number);
  const nearLimit = !isUnlimited && pct >= 80 && !overLimit;

  const colorMap: Record<string, { ring: string; bar: string; iconBg: string; iconText: string; pillBg: string; pillText: string }> = {
    emerald: { ring: 'border-emerald-200', bar: 'bg-emerald-500', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600', pillBg: 'bg-emerald-50', pillText: 'text-emerald-700' },
    blue:    { ring: 'border-blue-200',    bar: 'bg-blue-500',    iconBg: 'bg-blue-50',    iconText: 'text-blue-600',    pillBg: 'bg-blue-50',    pillText: 'text-blue-700' },
    violet:  { ring: 'border-violet-200',  bar: 'bg-violet-500',  iconBg: 'bg-violet-50',  iconText: 'text-violet-600',  pillBg: 'bg-violet-50',  pillText: 'text-violet-700' },
    amber:   { ring: 'border-amber-200',   bar: 'bg-amber-500',   iconBg: 'bg-amber-50',   iconText: 'text-amber-600',   pillBg: 'bg-amber-50',   pillText: 'text-amber-700' },
    pink:    { ring: 'border-pink-200',    bar: 'bg-pink-500',    iconBg: 'bg-pink-50',    iconText: 'text-pink-600',    pillBg: 'bg-pink-50',    pillText: 'text-pink-700' },
  };
  const c = colorMap[color] || colorMap.emerald;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.iconBg}`}>
          <Icon size={18} className={c.iconText} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-900 text-sm">{label}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {isUnlimited ? (
              <>{used.toLocaleString()} used · <span className="text-emerald-700 font-bold">unlimited</span> on this plan</>
            ) : (
              <>{used.toLocaleString()} of {(limit as number).toLocaleString()} used</>
            )}
          </div>
        </div>
        {overLimit && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            Over limit
          </span>
        )}
        {nearLimit && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Near limit
          </span>
        )}
      </div>

      {!isUnlimited && (
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${overLimit ? 'bg-rose-500' : nearLimit ? 'bg-amber-500' : c.bar}`}
            style={{ width: `${overLimit ? 100 : pct}%` }}
          />
        </div>
      )}

      {overLimit && (
        <div className="mt-3 text-xs text-slate-600">
          {payAsYouGo ? (
            <>
              <strong>{(used - (limit as number)).toLocaleString()}</strong> over plan limit
              {rate > 0 && (
                <> · ₹{rate}/unit · <strong>₹{(overage * rate).toFixed(2)}</strong> in charges this period</>
              )}
            </>
          ) : (
            <span className="text-rose-700">Pay-As-You-Go is OFF — new {label.toLowerCase()} are blocked. Enable it on billing.</span>
          )}
        </div>
      )}
    </div>
  );
}
