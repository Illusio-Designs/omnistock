'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { Button, Badge, Card, Pagination, Select, Tooltip, Input, Modal } from '@/components/ui';
import { Truck, Package, MapPin, Calendar, Eye, ExternalLink, Search, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const STATUS_FILTERS = [
  { value: '',                 label: 'All Statuses' },
  { value: 'PENDING',          label: 'Pending' },
  { value: 'PICKED_UP',        label: 'Picked Up' },
  { value: 'IN_TRANSIT',       label: 'In Transit' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { value: 'DELIVERED',        label: 'Delivered' },
  { value: 'FAILED',           label: 'Failed' },
  { value: 'RETURNED',         label: 'Returned' },
];

const STATUS_VARIANT: Record<string, any> = {
  PENDING:          'slate',
  PICKED_UP:        'blue',
  IN_TRANSIT:       'blue',
  OUT_FOR_DELIVERY: 'amber',
  DELIVERED:        'emerald',
  FAILED:           'rose',
  RETURNED:         'rose',
};

export default function ShipmentsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState('');
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [trackingInput, setTrackingInput] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['shipments', page, pageSize, status],
    queryFn: () => api.get('/shipments', { params: { page, limit: pageSize, status: status || undefined } }).then(r => r.data).catch(() => ({ shipments: [], total: 0 })),
  });

  const shipments = data?.shipments || data || [];
  const total = data?.total || shipments.length;
  const delivered = shipments.filter((s: any) => s.status === 'DELIVERED').length;
  const inTransit = shipments.filter((s: any) => ['IN_TRANSIT', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(s.status)).length;

  return (
    <DashboardLayout>
      <div className="space-y-5 animate-slide-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Shipments</h1>
            <p className="text-sm text-slate-500 mt-1">{total} shipments tracked</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" leftIcon={<Search size={14} />} onClick={() => setTrackModalOpen(true)}>
              Track AWB
            </Button>
            <Button leftIcon={<Plus size={15} />}>Create Shipment</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total Shipments" value={total} icon={Package} color="emerald" />
          <StatCard label="In Transit"      value={inTransit} icon={Truck} color="sky" />
          <StatCard label="Delivered"       value={delivered} icon={MapPin} color="emerald" />
        </div>

        <Select value={status} onChange={setStatus} options={STATUS_FILTERS} />

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr className="text-left text-[10px] uppercase tracking-widest text-slate-400">
                  {['Order', 'Courier', 'AWB', 'Status', 'Weight', 'Charges', 'Shipped', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Loading…</td></tr>
                ) : shipments.length ? shipments.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-bold text-emerald-600">{s.orderNumber}</td>
                    <td className="px-4 py-3 text-slate-700">{s.courierName}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{s.trackingNumber || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[s.status] || 'slate'} dot>{s.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{s.weight ? `${s.weight} kg` : '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{s.charges ? `₹${s.charges}` : '—'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                      {s.shippedAt ? new Date(s.shippedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Tooltip content="View details"><button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900"><Eye size={13} /></button></Tooltip>
                        <Tooltip content="Track on courier site"><button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900"><ExternalLink size={13} /></button></Tooltip>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={8} className="px-4 py-16 text-center">
                    <div className="inline-flex w-14 h-14 rounded-2xl bg-emerald-50 items-center justify-center mb-3">
                      <Truck size={24} className="text-emerald-600" />
                    </div>
                    <div className="font-bold text-slate-900">No shipments yet</div>
                    <div className="text-xs text-slate-500 mt-1">Shipments appear here when orders are dispatched.</div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {total > pageSize && (
            <div className="border-t border-slate-100">
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
            </div>
          )}
        </Card>
      </div>

      {/* Track AWB Modal */}
      <Modal
        open={trackModalOpen}
        onClose={() => setTrackModalOpen(false)}
        title="Track a Shipment"
        description="Enter an AWB / tracking number to see live status"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTrackModalOpen(false)}>Cancel</Button>
            <Button disabled={!trackingInput}>Track</Button>
          </>
        }
      >
        <Input
          label="Tracking Number (AWB)"
          leftIcon={<Truck size={14} />}
          value={trackingInput}
          onChange={(e) => setTrackingInput(e.target.value)}
          placeholder="Paste AWB number…"
        />
      </Modal>
    </DashboardLayout>
  );
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
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
