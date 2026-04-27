'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Plus, Edit2, Trash2, Save } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

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
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setShowNew(true)}>
          New plan
        </Button>
      </div>

      <Modal
        open={showNew || !!editing}
        onClose={() => { setEditing(null); setShowNew(false); }}
        title={editing ? 'Edit plan' : 'New plan'}
        size="xl"
      >
        <PlanForm
          initial={editing}
          onClose={() => { setEditing(null); setShowNew(false); }}
          onSave={save}
        />
      </Modal>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="text-left p-3">#</th>
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
            {plans.map((p, idx) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="p-3 text-slate-500 font-semibold">{idx + 1}</td>
                <td className="p-3 font-mono text-xs">{p.code}</td>
                <td className="p-3 font-semibold">{p.name}</td>
                <td className="p-3 text-right">₹{Number(p.monthlyPrice).toLocaleString()}</td>
                <td className="p-3 text-right">₹{Number(p.yearlyPrice).toLocaleString()}</td>
                <td className="p-3 text-right">{p.maxFacilities ?? '∞'}</td>
                <td className="p-3 text-right">{p.maxSkus?.toLocaleString() ?? '∞'}</td>
                <td className="p-3 text-right">{p.maxUserRoles ?? '∞'}</td>
                <td className="p-3 text-center">{p.isActive ? '✅' : '—'}</td>
                <td className="p-3 flex gap-2 justify-end">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(p)}>
                    <Edit2 size={14} />
                  </Button>
                  <Button variant="danger" size="icon" onClick={() => del(p.id)}>
                    <Trash2 size={14} />
                  </Button>
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
    <div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Code" value={f.code ?? ''} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} />
        <Input label="Name" value={f.name ?? ''} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className="col-span-2">
          <Input label="Tagline" value={f.tagline ?? ''} onChange={(e) => setF({ ...f, tagline: e.target.value })} />
        </div>
        <Input label="Monthly price (₹)" type="number" value={f.monthlyPrice ?? ''} onChange={(e) => setF({ ...f, monthlyPrice: Number(e.target.value) })} />
        <Input label="Yearly price (₹)"  type="number" value={f.yearlyPrice ?? ''}  onChange={(e) => setF({ ...f, yearlyPrice: Number(e.target.value) })} />
        <Input label="Max facilities (blank=∞)" type="number" value={f.maxFacilities ?? ''} onChange={(e) => setF({ ...f, maxFacilities: e.target.value === '' ? null : Number(e.target.value) })} />
        <Input label="Max SKUs (blank=∞)"       type="number" value={f.maxSkus ?? ''}       onChange={(e) => setF({ ...f, maxSkus: e.target.value === '' ? null : Number(e.target.value) })} />
        <Input label="Max user roles (blank=∞)" type="number" value={f.maxUserRoles ?? ''}  onChange={(e) => setF({ ...f, maxUserRoles: e.target.value === '' ? null : Number(e.target.value) })} />
        <Input label="Max users (blank=∞)"      type="number" value={f.maxUsers ?? ''}      onChange={(e) => setF({ ...f, maxUsers: e.target.value === '' ? null : Number(e.target.value) })} />
        <Input label="Max orders/mo (blank=∞)"  type="number" value={f.maxOrdersPerMonth ?? ''} onChange={(e) => setF({ ...f, maxOrdersPerMonth: e.target.value === '' ? null : Number(e.target.value) })} />
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
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" leftIcon={<Save size={14} />} onClick={() => onSave(f)}>Save</Button>
      </div>
    </div>
  );
}
