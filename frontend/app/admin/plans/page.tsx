'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);

  const load = () => adminApi.plans().then((r) => setPlans(r.data));
  useEffect(() => { load(); }, []);

  const save = async (data: any) => {
    if (data.id) await adminApi.updatePlan(data.id, data);
    else await adminApi.createPlan(data);
    setEditing(null); setShowNew(false); load();
  };

  const del = async (id: string) => {
    if (!confirm('Deactivate this plan?')) return;
    await adminApi.deletePlan(id); load();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Plans</h1>
          <p className="text-slate-500 mt-1">Subscription tiers shown on the public pricing page.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-semibold">
          <Plus size={16} /> New plan
        </button>
      </div>

      {(showNew || editing) && (
        <PlanForm
          initial={editing}
          onClose={() => { setEditing(null); setShowNew(false); }}
          onSave={save}
        />
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="text-left p-3">Code</th>
              <th className="text-left p-3">Name</th>
              <th className="text-right p-3">Monthly</th>
              <th className="text-right p-3">Yearly</th>
              <th className="text-right p-3">Facilities</th>
              <th className="text-right p-3">SKUs</th>
              <th className="text-right p-3">Roles</th>
              <th className="text-center p-3">Active</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="p-3 font-mono text-xs">{p.code}</td>
                <td className="p-3 font-semibold">{p.name}</td>
                <td className="p-3 text-right">₹{Number(p.monthlyPrice).toLocaleString()}</td>
                <td className="p-3 text-right">₹{Number(p.yearlyPrice).toLocaleString()}</td>
                <td className="p-3 text-right">{p.maxFacilities ?? '∞'}</td>
                <td className="p-3 text-right">{p.maxSkus?.toLocaleString() ?? '∞'}</td>
                <td className="p-3 text-right">{p.maxUserRoles ?? '∞'}</td>
                <td className="p-3 text-center">{p.isActive ? '✅' : '—'}</td>
                <td className="p-3 flex gap-2 justify-end">
                  <button onClick={() => setEditing(p)} className="text-slate-500 hover:text-slate-900"><Edit2 size={14} /></button>
                  <button onClick={() => del(p.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlanForm({ initial, onClose, onSave }: {
  initial: any;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [f, setF] = useState<any>(initial || {
    code: '', name: '', tagline: '', monthlyPrice: 0, yearlyPrice: 0,
    maxFacilities: 1, maxSkus: 100000, maxUserRoles: 3, maxUsers: 5, maxOrdersPerMonth: 5000,
    features: {}, meteredRates: {}, isPublic: true, isActive: true, sortOrder: 0,
  });
  const FEATURES = [
    'returns','vms','paymentReconciliation','mobileApp','purchaseManagement','barcoding',
    'inwardLogistics','customReports','apiIntegration','advancedWarehouseOps','vendorManagement',
    'omniChannel','erpIntegration',
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">{initial ? 'Edit plan' : 'New plan'}</h2>
        <button onClick={onClose}><X size={18} /></button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Code" value={f.code} onChange={(v) => setF({ ...f, code: v.toUpperCase() })} />
        <Input label="Name" value={f.name} onChange={(v) => setF({ ...f, name: v })} />
        <Input label="Tagline" value={f.tagline} onChange={(v) => setF({ ...f, tagline: v })} className="col-span-2" />
        <Input label="Monthly price (₹)" type="number" value={f.monthlyPrice} onChange={(v) => setF({ ...f, monthlyPrice: Number(v) })} />
        <Input label="Yearly price (₹)"  type="number" value={f.yearlyPrice}  onChange={(v) => setF({ ...f, yearlyPrice: Number(v) })} />
        <Input label="Max facilities (blank=∞)" type="number" value={f.maxFacilities ?? ''} onChange={(v) => setF({ ...f, maxFacilities: v === '' ? null : Number(v) })} />
        <Input label="Max SKUs (blank=∞)"       type="number" value={f.maxSkus ?? ''}       onChange={(v) => setF({ ...f, maxSkus: v === '' ? null : Number(v) })} />
        <Input label="Max user roles (blank=∞)" type="number" value={f.maxUserRoles ?? ''}  onChange={(v) => setF({ ...f, maxUserRoles: v === '' ? null : Number(v) })} />
        <Input label="Max users (blank=∞)"      type="number" value={f.maxUsers ?? ''}      onChange={(v) => setF({ ...f, maxUsers: v === '' ? null : Number(v) })} />
        <Input label="Max orders/mo (blank=∞)"  type="number" value={f.maxOrdersPerMonth ?? ''} onChange={(v) => setF({ ...f, maxOrdersPerMonth: v === '' ? null : Number(v) })} />
      </div>

      <div className="mt-4">
        <div className="text-xs font-semibold text-slate-600 uppercase mb-2">Features</div>
        <div className="grid grid-cols-3 gap-2">
          {FEATURES.map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!f.features?.[k]}
                onChange={(e) => setF({ ...f, features: { ...f.features, [k]: e.target.checked } })}
              />
              {k}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-5 flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-slate-600">Cancel</button>
        <button onClick={() => onSave(f)} className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-semibold inline-flex items-center gap-2">
          <Save size={14} /> Save
        </button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', className = '' }: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-200" />
    </div>
  );
}
