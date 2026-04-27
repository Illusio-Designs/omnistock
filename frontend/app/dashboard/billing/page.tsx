'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { billingApi, planApi, paymentApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { CheckCircle2, AlertCircle, Zap, Crown, Sparkles, X, Wallet, Plus, Settings2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { TopupModal, WALLET_CHANGED_EVENT } from '@/components/wallet/TopupModal';

export default function BillingPage() {
  const { hasPermission } = useAuthStore();
  const canManage = hasPermission('billing.manage');

  const [sub, setSub] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [topupOpen, setTopupOpen] = useState(false);
  const [showWalletSettings, setShowWalletSettings] = useState(false);
  const [walletSettings, setWalletSettings] = useState({
    lowBalanceThreshold: '',
    autoTopupEnabled: false,
    autoTopupAmount: '',
    autoTopupTriggerBelow: '',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const load = async () => {
    const [s, u, p, w, t] = await Promise.all([
      billingApi.subscription(),
      billingApi.usage(),
      planApi.list(),
      billingApi.wallet().catch(() => ({ data: null })),
      billingApi.walletTransactions(20).catch(() => ({ data: [] })),
    ]);
    setSub(s.data); setUsage(u.data); setPlans(p.data);
    const walletData = w.data;
    setWallet(walletData);
    setTxns(t.data?.transactions || (Array.isArray(t.data) ? t.data : []));
    if (walletData) {
      setWalletSettings({
        lowBalanceThreshold: walletData.lowBalanceThreshold ?? '',
        autoTopupEnabled: !!walletData.autoTopupEnabled,
        autoTopupAmount: walletData.autoTopupAmount ?? '',
        autoTopupTriggerBelow: walletData.autoTopupTriggerBelow ?? '',
      });
    }
  };

  const saveWalletSettings = async () => {
    setSavingSettings(true);
    try {
      await billingApi.walletSettings({
        lowBalanceThreshold: walletSettings.lowBalanceThreshold ? Number(walletSettings.lowBalanceThreshold) : undefined,
        autoTopupEnabled: walletSettings.autoTopupEnabled,
        autoTopupAmount: walletSettings.autoTopupAmount ? Number(walletSettings.autoTopupAmount) : undefined,
        autoTopupTriggerBelow: walletSettings.autoTopupTriggerBelow ? Number(walletSettings.autoTopupTriggerBelow) : undefined,
      });
      setMsg('Wallet settings saved');
      setShowWalletSettings(false);
      await load();
    } catch (e: any) {
      setMsg(e?.response?.data?.error || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener(WALLET_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(WALLET_CHANGED_EVENT, onChange);
  }, []);

  // Razorpay checkout helper — lazy-loads the script the first time
  const loadRazorpay = () =>
    new Promise<boolean>((resolve) => {
      if ((window as any).Razorpay) return resolve(true);
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const change = async (planCode: string) => {
    if (!canManage) return;
    setLoading(true); setMsg('');
    try {
      // Try real payment flow first; fall back to free switch when in stub mode
      const { data } = await paymentApi.checkout({ planCode, billingCycle: 'MONTHLY' });
      if (data.order?.stub) {
        // Stub mode — no real payment gateway configured
        await paymentApi.verify({
          razorpay_order_id: data.order.id,
          razorpay_payment_id: `pay_stub_${Date.now()}`,
          razorpay_signature: 'stub',
          planCode,
          billingCycle: 'MONTHLY',
        });
        setMsg(`Switched to ${planCode} (stub)`);
        await load();
        return;
      }
      const ok = await loadRazorpay();
      if (!ok) throw new Error('Failed to load Razorpay');
      const rzp = new (window as any).Razorpay({
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency,
        order_id: data.order.id,
        name: 'OmniStock',
        description: `${data.plan.name} plan`,
        prefill: data.prefill,
        handler: async (resp: any) => {
          await paymentApi.verify({ ...resp, planCode, billingCycle: 'MONTHLY' });
          setMsg(`Switched to ${planCode}`);
          await load();
        },
      });
      rzp.open();
    } catch (e: any) {
      setMsg(e?.response?.data?.error || e.message || 'Failed');
    } finally { setLoading(false); }
  };

  const togglePayg = async () => {
    if (!canManage) return;
    await billingApi.togglePayg(!sub?.payAsYouGo);
    await load();
  };

  if (!sub || !usage) return <DashboardLayout><div className="p-8">Loading…</div></DashboardLayout>;

  const plan = sub.plan;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Billing & Subscription</h1>
          <p className="text-slate-500 mt-1">Manage your plan, usage and pay-as-you-go.</p>
        </div>

        {msg && <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">{msg}</div>}

        {/* Current plan */}
        <div className="bg-gradient-to-br from-slate-900 to-emerald-900 text-white p-6 rounded-3xl shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-emerald-300 font-bold">Current plan</div>
              <div className="text-3xl font-bold mt-1 flex items-center gap-2">
                {plan.name} <Crown size={20} className="text-amber-400" />
              </div>
              <div className="text-sm text-white/70 mt-1">
                Status: <b>{sub.status}</b> · Renews {new Date(sub.currentPeriodEnd).toLocaleDateString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">₹{Number(plan.monthlyPrice).toLocaleString()}<span className="text-sm font-normal text-white/60">/mo</span></div>
              <button
                onClick={togglePayg}
                disabled={!canManage}
                className={`mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${
                  sub.payAsYouGo ? 'bg-emerald-400 text-slate-900' : 'bg-white/10 text-white'
                } disabled:opacity-50`}
              >
                <Zap size={12} /> Pay-as-you-go {sub.payAsYouGo ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Wallet */}
        {wallet && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <Wallet size={20} className="text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">Wallet balance</div>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowWalletSettings(!showWalletSettings)}
                        title="Wallet settings"
                        className="h-7 w-7"
                      >
                        <Settings2 size={13} />
                      </Button>
                    )}
                  </div>
                  <div className={`text-3xl font-bold mt-1 ${wallet.lowBalance ? 'text-rose-600' : 'text-slate-900'}`}>
                    ₹{Number(wallet.balance).toLocaleString()}
                  </div>
                  {wallet.lowBalance ? (
                    <div className="text-xs text-rose-600 font-bold mt-1">Low balance — top up soon</div>
                  ) : (
                    <div className="text-xs text-slate-500 mt-1">Used for overage charges when plan limits are exceeded</div>
                  )}
                </div>
              </div>
              {canManage && (
                <Button
                  variant="primary"
                  leftIcon={<Plus size={14} />}
                  onClick={() => setTopupOpen(true)}
                >
                  Top up
                </Button>
              )}
            </div>

            {txns.length > 0 && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recent transactions</div>
                <div className="space-y-1">
                  {txns.slice(0, 5).map((t: any) => {
                    const isCredit = ['TOPUP', 'REFUND'].includes(t.type);
                    const amt = Number(t.amount);
                    return (
                      <div key={t.id} className="flex items-center justify-between py-1.5 text-sm">
                        <div>
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isCredit ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span className="font-medium text-slate-700">{t.description || t.type}</span>
                          <span className="text-xs text-slate-400 ml-2">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <span className={`font-bold ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isCredit ? '+' : ''}₹{Math.abs(amt).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {showWalletSettings && canManage && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Auto top-up settings</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Low balance alert below (₹)"
                    type="number"
                    value={walletSettings.lowBalanceThreshold}
                    onChange={(e) => setWalletSettings(s => ({ ...s, lowBalanceThreshold: e.target.value }))}
                    placeholder="e.g. 500"
                  />
                  <div className="flex items-end pb-1">
                    <Checkbox
                      label="Enable auto top-up"
                      checked={walletSettings.autoTopupEnabled}
                      onCheckedChange={(v) => setWalletSettings(s => ({ ...s, autoTopupEnabled: v }))}
                    />
                  </div>
                  {walletSettings.autoTopupEnabled && (
                    <>
                      <Input
                        label="Top-up amount (₹)"
                        type="number"
                        value={walletSettings.autoTopupAmount}
                        onChange={(e) => setWalletSettings(s => ({ ...s, autoTopupAmount: e.target.value }))}
                        placeholder="e.g. 1000"
                      />
                      <Input
                        label="Trigger when balance below (₹)"
                        type="number"
                        value={walletSettings.autoTopupTriggerBelow}
                        onChange={(e) => setWalletSettings(s => ({ ...s, autoTopupTriggerBelow: e.target.value }))}
                        placeholder="e.g. 200"
                      />
                    </>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="primary" size="sm" onClick={saveWalletSettings} loading={savingSettings}>
                    Save settings
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowWalletSettings(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Usage */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <UsageCard label="Facilities"  used={usage.used.facilities}      limit={plan.maxFacilities} />
          <UsageCard label="SKUs"        used={usage.used.skus}            limit={plan.maxSkus} />
          <UsageCard label="Users"       used={usage.used.users}           limit={plan.maxUsers} />
          <UsageCard label="Roles"       used={usage.used.roles}           limit={plan.maxUserRoles} />
          <UsageCard label="Orders (mo)" used={usage.used.ordersThisPeriod} limit={plan.maxOrdersPerMonth} />
        </div>

        {/* Plans */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Sparkles size={18} className="text-emerald-600" /> Switch plan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((p: any) => {
              const current = p.code === plan.code;
              const features = Object.entries(p.features || {});
              return (
                <div key={p.code} className={`p-5 rounded-2xl border-2 ${current ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-lg">{p.name}</div>
                    {current && <span className="text-xs font-bold text-emerald-700">CURRENT</span>}
                  </div>
                  <div className="text-2xl font-bold mt-2">₹{Number(p.monthlyPrice).toLocaleString()}<span className="text-xs text-slate-500">/mo</span></div>
                  <div className="text-xs text-slate-500 mt-2 space-y-1">
                    <div>{p.maxFacilities ?? '∞'} facilities · {p.maxSkus ? p.maxSkus.toLocaleString() : '∞'} SKUs</div>
                    <div>{p.maxUserRoles ?? '∞'} roles · {p.maxUsers ?? '∞'} users</div>
                  </div>
                  <ul className="text-xs mt-3 space-y-1.5">
                    {features.slice(0, 6).map(([k, v]) => (
                      <li key={k} className="flex items-center gap-1.5">
                        {v ? <CheckCircle2 size={12} className="text-emerald-600" /> : <X size={12} className="text-slate-300" />}
                        <span className={v ? 'text-slate-700' : 'text-slate-400'}>{k}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="primary"
                    fullWidth
                    className="mt-4"
                    disabled={current || !canManage || loading}
                    onClick={() => change(p.code)}
                  >
                    {current ? 'Active' : 'Switch'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <TopupModal
        open={topupOpen}
        onClose={() => setTopupOpen(false)}
        currentBalance={wallet ? Number(wallet.balance) : undefined}
      />
    </DashboardLayout>
  );
}

function UsageCard({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  const danger = limit && pct >= 90;
  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200">
      <div className="text-xs font-semibold text-slate-500 uppercase">{label}</div>
      <div className="text-2xl font-bold mt-1">
        {used}<span className="text-sm text-slate-400"> / {limit ?? '∞'}</span>
      </div>
      {limit && (
        <div className="h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden">
          <div className={`h-full ${danger ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      {danger && <div className="text-[10px] text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={10} /> Near limit</div>}
    </div>
  );
}
