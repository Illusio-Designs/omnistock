'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi, planApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { ArrowRight, Sparkles, Building2, User, Lock, CheckCircle2 } from 'lucide-react';

function OnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [step, setStep] = useState(1);
  const [plans, setPlans] = useState<any[]>([]);
  const [planCode, setPlanCode] = useState(params.get('plan') || 'STANDARD');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({
    ownerName: '', email: '', password: '',
    businessName: '', phone: '', gstin: '',
    industry: '', companySize: '', country: 'IN',
  });

  useEffect(() => {
    planApi.list().then((r) => setPlans(r.data || [])).catch(() => {});
  }, []);

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setErr('');
    setLoading(true);
    try {
      const { data } = await authApi.onboard({ ...form, planCode });
      setAuth(data.user, data.token);
      router.push('/dashboard/billing');
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Onboarding failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-50 via-emerald-50/60 to-white">
      <div className="pointer-events-none absolute -top-40 -left-32 w-[480px] h-[480px] rounded-full bg-[#0B1220]/[0.05] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 w-[480px] h-[480px] rounded-full bg-[#06D4B8]/[0.10] blur-3xl" />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase tracking-wider">
            <Sparkles size={12} /> Get Started
          </div>
          <h1 className="text-4xl font-bold mt-3 bg-gradient-to-r from-[#06D4B8] to-[#06B6D4] bg-clip-text text-transparent">Set up your business</h1>
          <p className="text-slate-600 mt-2">14-day free trial. No credit card required.</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`flex items-center gap-2 ${n < 3 ? 'flex-1 max-w-[160px]' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= n ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>{n}</div>
              {n < 3 && <div className={`flex-1 h-0.5 ${step > n ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <User size={18} /> Your account
              </h2>
              <Field label="Full name"   value={form.ownerName} onChange={(v) => update('ownerName', v)} />
              <Field label="Work email"  value={form.email}     onChange={(v) => update('email', v)} type="email" />
              <Field label="Password"    value={form.password}  onChange={(v) => update('password', v)} type="password" />
              <button
                onClick={() => setStep(2)}
                disabled={!form.ownerName || !form.email || form.password.length < 6}
                className="btn-primary w-full mt-4 disabled:opacity-50"
              >
                Continue <ArrowRight size={16} className="inline ml-1" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Building2 size={18} /> Your business
              </h2>
              <Field label="Business name"  value={form.businessName} onChange={(v) => update('businessName', v)} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Phone"   value={form.phone}   onChange={(v) => update('phone', v)} />
                <Field label="GSTIN"   value={form.gstin}   onChange={(v) => update('gstin', v.toUpperCase())} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Industry"     value={form.industry}     onChange={(v) => update('industry', v)} />
                <Field label="Company size" value={form.companySize}  onChange={(v) => update('companySize', v)} />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!form.businessName}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  Continue <ArrowRight size={16} className="inline ml-1" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Lock size={18} /> Choose your plan
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {plans.map((p) => (
                  <button
                    key={p.code}
                    onClick={() => setPlanCode(p.code)}
                    className={`text-left p-4 rounded-2xl border-2 transition-all ${
                      planCode === p.code
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      {planCode === p.code && <CheckCircle2 size={16} className="text-emerald-600" />}
                    </div>
                    <div className="text-2xl font-bold mt-2">₹{Number(p.monthlyPrice).toLocaleString()}<span className="text-xs text-slate-500">/mo</span></div>
                    <div className="text-xs text-slate-500 mt-1">
                      {p.maxFacilities ?? '∞'} facility · {p.maxUserRoles ?? '∞'} roles
                    </div>
                  </button>
                ))}
              </div>

              {err && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{err}</div>}

              <div className="flex gap-2 mt-4">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
                <button onClick={submit} disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
                  {loading ? 'Creating…' : 'Create my account'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
      />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingInner />
    </Suspense>
  );
}
