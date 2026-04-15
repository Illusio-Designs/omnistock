'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { customerApi } from '@/lib/api';
import {
  Button, Badge, Card, Modal, Input, Pagination, Tooltip, Checkbox,
} from '@/components/ui';
import {
  Plus, Users, Mail, Phone, UserPlus, TrendingUp, Crown,
} from 'lucide-react';

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, pageSize],
    queryFn: () => customerApi.list({ page, limit: pageSize }).then(r => r.data),
  });

  const customers = data?.customers || data || [];
  const total = data?.total || customers.length;
  const b2bCount = customers.filter((c: any) => c.isB2B).length;

  return (
    <DashboardLayout>
      <div className="space-y-5 animate-slide-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Customers</h1>
            <p className="text-sm text-slate-500 mt-1">{total} total customers</p>
          </div>
          <Button leftIcon={<UserPlus size={15} />} onClick={() => setModalOpen(true)}>
            New Customer
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total Customers" value={total} icon={Users} color="emerald" />
          <StatCard label="B2B Accounts"    value={b2bCount} icon={Crown} color="amber" />
          <StatCard label="This Month"      value={Math.floor(total * 0.12)} icon={TrendingUp} color="sky" />
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr className="text-left text-[10px] uppercase tracking-widest text-slate-400">
                  {['Customer', 'Email', 'Phone', 'Type', 'GSTIN', 'Joined'].map(h => (
                    <th key={h} className="px-4 py-3 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">Loading…</td></tr>
                ) : customers.length ? customers.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {c.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{c.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{c.id?.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.email || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{c.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={c.isB2B ? 'amber' : 'emerald'}>
                        {c.isB2B ? 'B2B' : 'Retail'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{c.gstIn || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">No customers yet</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {customers.map((c: any) => (
              <div key={c.id} className="p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {c.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 truncate">{c.name}</div>
                  <div className="text-xs text-slate-500 truncate">{c.email || c.phone || '—'}</div>
                </div>
                <Badge variant={c.isB2B ? 'amber' : 'emerald'}>{c.isB2B ? 'B2B' : 'Retail'}</Badge>
              </div>
            ))}
          </div>

          {total > pageSize && (
            <div className="border-t border-slate-100">
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
              />
            </div>
          )}
        </Card>
      </div>

      <NewCustomerModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </DashboardLayout>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    amber:   'bg-amber-50 text-amber-600',
    sky:     'bg-sky-50 text-sky-600',
  };
  return (
    <Card className="p-5">
      <div className={`w-10 h-10 rounded-xl ${colorMap[color]} flex items-center justify-center mb-3`}>
        <Icon size={17} />
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">{label}</div>
    </Card>
  );
}

function NewCustomerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', phone: '', gstIn: '', isB2B: false });
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: () => customerApi.create({
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      gstIn: form.gstIn || undefined,
      isB2B: form.isB2B,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setForm({ name: '', email: '', phone: '', gstIn: '', isB2B: false });
      setError('');
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.error || err.message),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Customer"
      description="Add a customer to your database"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => { setError(''); createMutation.mutate(); }}
            loading={createMutation.isPending}
            disabled={!form.name}
          >
            Create Customer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Priya Mehta" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Email" type="email" leftIcon={<Mail size={14} />} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="priya@example.com" />
          <Input label="Phone" leftIcon={<Phone size={14} />} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 90000 00000" />
        </div>
        <Input label="GSTIN (optional)" value={form.gstIn} onChange={(e) => setForm({ ...form, gstIn: e.target.value })} placeholder="22AAAAA0000A1Z5" />
        <Checkbox
          label="B2B Customer"
          description="Mark as wholesale / business buyer"
          checked={form.isB2B}
          onCheckedChange={(v) => setForm({ ...form, isB2B: v })}
        />
        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      </div>
    </Modal>
  );
}
