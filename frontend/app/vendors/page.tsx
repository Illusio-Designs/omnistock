'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { vendorApi } from '@/lib/api';
import {
  Button, Badge, Card, Modal, Input, Textarea, Tooltip,
} from '@/components/ui';
import { Plus, Building2, Mail, Phone, Pencil, Trash2 } from 'lucide-react';

export default function VendorsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => vendorApi.list().then(r => r.data),
  });

  const vendors = data || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vendorApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      setDeleteTarget(null);
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-5 animate-slide-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Vendors</h1>
            <p className="text-sm text-slate-500 mt-1">{vendors.length} suppliers</p>
          </div>
          <Button leftIcon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>
            New Vendor
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Card key={i} className="p-5 animate-shimmer h-48" />)}
          </div>
        ) : vendors.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((v: any) => (
              <Card key={v.id} className="p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {v.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{v.name}</h3>
                    {v.gstin && <div className="text-[10px] text-slate-400 font-mono mt-0.5">{v.gstin}</div>}
                  </div>
                  <Badge variant={v.isActive ? 'emerald' : 'slate'} dot>
                    {v.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="space-y-2 text-xs text-slate-600">
                  {v.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="text-slate-400" />
                      <span className="truncate">{v.email}</span>
                    </div>
                  )}
                  {v.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-slate-400" />
                      <span>{v.phone}</span>
                    </div>
                  )}
                  {v.paymentTerms && (
                    <div className="flex items-center gap-2">
                      <Building2 size={12} className="text-slate-400" />
                      <span>{v.paymentTerms}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                  <Button variant="ghost" size="sm" leftIcon={<Pencil size={12} />} onClick={() => setEditVendor(v)} className="flex-1">
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" leftIcon={<Trash2 size={12} />} onClick={() => setDeleteTarget(v)} className="flex-1">
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-16 text-center">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-emerald-50 items-center justify-center mb-4">
              <Building2 size={28} className="text-emerald-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">No vendors yet</h3>
            <p className="text-sm text-slate-500 mt-1">Add your first supplier to start creating purchase orders.</p>
            <Button leftIcon={<Plus size={14} />} onClick={() => setCreateOpen(true)} className="mt-5">
              New Vendor
            </Button>
          </Card>
        )}
      </div>

      <VendorModal open={createOpen} onClose={() => setCreateOpen(false)} mode="create" />
      <VendorModal open={!!editVendor} onClose={() => setEditVendor(null)} mode="edit" vendor={editVendor} />

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Vendor"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
              loading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Delete <span className="font-bold">{deleteTarget?.name}</span>? This cannot be undone.
        </p>
      </Modal>
    </DashboardLayout>
  );
}

function VendorModal({ open, onClose, mode, vendor }: {
  open: boolean; onClose: () => void; mode: 'create' | 'edit'; vendor?: any;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name:         vendor?.name         || '',
    email:        vendor?.email        || '',
    phone:        vendor?.phone        || '',
    gstin:        vendor?.gstin        || '',
    paymentTerms: vendor?.paymentTerms || '',
    address:      typeof vendor?.address === 'object' ? (vendor?.address?.line1 || '') : (vendor?.address || ''),
    isActive:     vendor?.isActive ?? true,
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        gstin: form.gstin || undefined,
        paymentTerms: form.paymentTerms || undefined,
        address: form.address ? { line1: form.address } : undefined,
        isActive: form.isActive,
      };
      return mode === 'create' ? vendorApi.create(payload) : vendorApi.update(vendor.id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      setError('');
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.error || err.message),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'New Vendor' : 'Edit Vendor'}
      description={mode === 'create' ? 'Add a supplier to source products from' : 'Update supplier details'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => { setError(''); mutation.mutate(); }}
            loading={mutation.isPending}
            disabled={!form.name}
          >
            {mode === 'create' ? 'Create Vendor' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Vendor Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mumbai Textiles Co." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Email" type="email" leftIcon={<Mail size={14} />} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" leftIcon={<Phone size={14} />} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="GSTIN" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} placeholder="22AAAAA0000A1Z5" />
          <Input label="Payment Terms" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} placeholder="Net 30" />
        </div>
        <Textarea label="Address (optional)" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} placeholder="Street, city, state, pincode" />
        {mode === 'edit' && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4 accent-emerald-600"
            />
            <span className="text-sm font-semibold text-slate-700">Active vendor</span>
          </label>
        )}
        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      </div>
    </Modal>
  );
}
