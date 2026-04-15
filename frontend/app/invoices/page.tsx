'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button, Badge, Card, Pagination, Select, Tooltip } from '@/components/ui';
import { FileText, Download, Eye, Plus, Receipt } from 'lucide-react';

const TYPE_FILTERS = [
  { value: '',             label: 'All Types' },
  { value: 'SALE',         label: 'Sale' },
  { value: 'PURCHASE',     label: 'Purchase' },
  { value: 'CREDIT_NOTE',  label: 'Credit Note' },
  { value: 'DEBIT_NOTE',   label: 'Debit Note' },
];

const STATUS_VARIANT: Record<string, any> = {
  DRAFT: 'slate',
  UNPAID: 'amber',
  PARTIALLY_PAID: 'blue',
  PAID: 'emerald',
  OVERDUE: 'rose',
  CANCELLED: 'slate',
};

export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [type, setType] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, pageSize, type],
    queryFn: () => api.get('/invoices', { params: { page, limit: pageSize, type: type || undefined } }).then(r => r.data).catch(() => ({ invoices: [], total: 0 })),
  });

  const invoices = data?.invoices || data || [];
  const total = data?.total || invoices.length;
  const totalValue = invoices.reduce((s: number, inv: any) => s + Number(inv.total || 0), 0);
  const paidCount = invoices.filter((i: any) => i.status === 'PAID').length;

  return (
    <DashboardLayout>
      <div className="space-y-5 animate-slide-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Invoices</h1>
            <p className="text-sm text-slate-500 mt-1">{total} invoices generated</p>
          </div>
          <Button leftIcon={<Plus size={15} />}>Create Invoice</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Receipt size={17} />
            </div>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalValue)}</div>
            <div className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">Total Value</div>
          </Card>
          <Card className="p-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <FileText size={17} />
            </div>
            <div className="text-2xl font-bold text-slate-900">{paidCount}</div>
            <div className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">Paid</div>
          </Card>
          <Card className="p-5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <FileText size={17} />
            </div>
            <div className="text-2xl font-bold text-slate-900">{total - paidCount}</div>
            <div className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">Pending</div>
          </Card>
        </div>

        <Select value={type} onChange={setType} options={TYPE_FILTERS} />

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr className="text-left text-[10px] uppercase tracking-widest text-slate-400">
                  {['Invoice #', 'Type', 'Reference', 'Amount', 'Status', 'Due Date', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Loading…</td></tr>
                ) : invoices.length ? invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-bold text-emerald-600">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3">
                      <Badge variant="slate">{inv.type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                      {inv.order?.orderNumber || inv.purchaseOrder?.poNumber || '—'}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">{formatCurrency(inv.total || 0)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[inv.status] || 'slate'}>{inv.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Tooltip content="View invoice"><button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900"><Eye size={13} /></button></Tooltip>
                        <Tooltip content="Download PDF"><button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900"><Download size={13} /></button></Tooltip>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="px-4 py-16 text-center">
                    <div className="inline-flex w-14 h-14 rounded-2xl bg-emerald-50 items-center justify-center mb-3">
                      <FileText size={24} className="text-emerald-600" />
                    </div>
                    <div className="font-bold text-slate-900">No invoices yet</div>
                    <div className="text-xs text-slate-500 mt-1">Invoices are auto-generated when orders ship.</div>
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
    </DashboardLayout>
  );
}
