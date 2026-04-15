'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { warehouseApi } from '@/lib/api';
import {
  Button, Badge, Card, Modal, Input, Textarea,
} from '@/components/ui';
import { Plus, Store, MapPin, Package } from 'lucide-react';

export default function WarehousesPage() {
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.list().then(r => r.data),
  });

  const warehouses = data || [];

  return (
    <DashboardLayout>
      <div className="space-y-5 animate-slide-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Warehouses</h1>
            <p className="text-sm text-slate-500 mt-1">{warehouses.length} fulfillment locations</p>
          </div>
          <Button leftIcon={<Plus size={15} />} onClick={() => setModalOpen(true)}>
            New Warehouse
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Card key={i} className="p-5 animate-shimmer h-48" />)}
          </div>
        ) : warehouses.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouses.map((w: any) => (
              <Card key={w.id} className="p-6 hover:shadow-lg transition-shadow relative overflow-hidden">
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-emerald-100 blur-2xl opacity-50" />
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg">
                      <Store size={18} />
                    </div>
                    <Badge variant={w.isActive ? 'emerald' : 'slate'} dot>
                      {w.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg">{w.name}</h3>
                  <div className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider mt-0.5">{w.code}</div>
                  {w.address && (
                    <div className="flex items-start gap-2 mt-3 text-xs text-slate-600">
                      <MapPin size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                      <span>
                        {typeof w.address === 'object'
                          ? [w.address.line1, w.address.city, w.address.state, w.address.pincode].filter(Boolean).join(', ')
                          : w.address}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-5 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Package size={12} className="text-emerald-500" />
                      <span className="font-bold">{w.inventoryItems?.length || 0}</span> SKUs
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-16 text-center">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-emerald-50 items-center justify-center mb-4">
              <Store size={28} className="text-emerald-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">No warehouses yet</h3>
            <p className="text-sm text-slate-500 mt-1">Add a fulfillment location to start managing inventory.</p>
            <Button leftIcon={<Plus size={14} />} onClick={() => setModalOpen(true)} className="mt-5">
              New Warehouse
            </Button>
          </Card>
        )}
      </div>

      <NewWarehouseModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </DashboardLayout>
  );
}

function NewWarehouseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '', code: '', line1: '', city: '', state: '', pincode: '',
  });
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: () => warehouseApi.create({
      name: form.name,
      code: form.code,
      address: {
        line1: form.line1,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        country: 'India',
      },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] });
      setForm({ name: '', code: '', line1: '', city: '', state: '', pincode: '' });
      setError('');
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.error || err.message),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Warehouse"
      description="Add a fulfillment location"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => { setError(''); createMutation.mutate(); }}
            loading={createMutation.isPending}
            disabled={!form.name || !form.code}
          >
            Create Warehouse
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Warehouse Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main Warehouse" />
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="WH-01" />
        </div>
        <Input label="Address Line" leftIcon={<MapPin size={14} />} value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} placeholder="Street, area, landmark" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Bangalore" />
          <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="Karnataka" />
          <Input label="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} placeholder="560001" />
        </div>
        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      </div>
    </Modal>
  );
}
