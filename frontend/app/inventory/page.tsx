'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { inventoryApi, warehouseApi } from '@/lib/api';
import {
  Button, Badge, Card, Modal, Input, Textarea, Select, Pagination,
} from '@/components/ui';
import { AlertTriangle, Plus } from 'lucide-react';

const TYPE_OPTIONS = [
  { value: 'INBOUND',    label: 'Inbound (Add Stock)' },
  { value: 'OUTBOUND',   label: 'Outbound (Remove Stock)' },
  { value: 'ADJUSTMENT', label: 'Adjustment' },
];

export default function InventoryPage() {
  const qc = useQueryClient();
  const [warehouseId, setWarehouseId] = useState('');
  const [showAdjust, setShowAdjust] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [adjustForm, setAdjustForm] = useState({
    warehouseId: '', variantId: '', quantity: 0, type: 'ADJUSTMENT', notes: '',
  });
  const [error, setError] = useState('');

  const { data } = useQuery({
    queryKey: ['inventory', warehouseId, page, pageSize],
    queryFn: () => inventoryApi.list({
      warehouseId: warehouseId || undefined,
      page, limit: pageSize,
    }).then(r => r.data),
  });
  const { data: lowStock } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => inventoryApi.lowStock().then(r => r.data),
  });
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.list().then(r => r.data),
  });

  const warehouseOptions = [
    { value: '', label: 'All Warehouses' },
    ...(warehouses || []).map((w: any) => ({ value: w.id, label: w.name })),
  ];
  const adjustWarehouseOptions = (warehouses || []).map((w: any) => ({
    value: w.id, label: w.name,
  }));

  const adjustMutation = useMutation({
    mutationFn: (d: any) => inventoryApi.adjust(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      setShowAdjust(false);
      setAdjustForm({ warehouseId: '', variantId: '', quantity: 0, type: 'ADJUSTMENT', notes: '' });
    },
    onError: (err: any) => setError(err.response?.data?.error || err.message),
  });

  return (
    <DashboardLayout>
      <div className="space-y-5 animate-slide-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Inventory</h1>
            <p className="text-sm text-slate-500 mt-1">{data?.total || 0} SKUs tracked</p>
          </div>
          <Button leftIcon={<Plus size={15} />} onClick={() => setShowAdjust(true)}>
            Adjust Stock
          </Button>
        </div>

        {lowStock && lowStock.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-800 text-sm">{lowStock.length} items are running low on stock</p>
              <p className="text-amber-700 text-xs mt-0.5">Review and reorder soon to avoid stockouts.</p>
            </div>
          </div>
        )}

        <Select
          value={warehouseId}
          onChange={setWarehouseId}
          options={warehouseOptions}
        />

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr className="text-left text-[10px] uppercase tracking-widest text-slate-400">
                  {['Product', 'SKU', 'Warehouse', 'On Hand', 'Reserved', 'Available', 'Reorder', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.items?.length ? data.items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{item.variant?.product?.name}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{item.variant?.sku}</td>
                    <td className="px-4 py-3 text-slate-500">{item.warehouse?.name}</td>
                    <td className="px-4 py-3 font-semibold">{item.quantityOnHand}</td>
                    <td className="px-4 py-3 text-slate-400">{item.quantityReserved}</td>
                    <td className="px-4 py-3 font-bold">{item.quantityAvailable}</td>
                    <td className="px-4 py-3 text-slate-400">{item.reorderPoint}</td>
                    <td className="px-4 py-3">
                      {item.quantityAvailable <= item.reorderPoint ? (
                        <Badge variant="rose" dot>Low Stock</Badge>
                      ) : (
                        <Badge variant="emerald" dot>In Stock</Badge>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No inventory items</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {(data?.total || 0) > pageSize && (
            <div className="border-t border-slate-100">
              <Pagination
                page={page}
                pageSize={pageSize}
                total={data?.total || 0}
                onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
              />
            </div>
          )}
        </Card>
      </div>

      {/* Adjust Stock Modal */}
      <Modal
        open={showAdjust}
        onClose={() => { setShowAdjust(false); setError(''); }}
        title="Adjust Stock"
        description="Add, remove, or correct inventory at a specific warehouse"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdjust(false)}>Cancel</Button>
            <Button
              onClick={() => { setError(''); adjustMutation.mutate(adjustForm); }}
              loading={adjustMutation.isPending}
              disabled={!adjustForm.warehouseId || !adjustForm.variantId || !adjustForm.quantity}
            >
              Save Adjustment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Warehouse"
            value={adjustForm.warehouseId}
            onChange={(v) => setAdjustForm(f => ({ ...f, warehouseId: v }))}
            options={adjustWarehouseOptions}
            placeholder="Select warehouse…"
            fullWidth
          />
          <Input
            label="Variant ID"
            value={adjustForm.variantId}
            onChange={(e) => setAdjustForm(f => ({ ...f, variantId: e.target.value }))}
            placeholder="Paste the variant UUID"
          />
          <Select
            label="Movement Type"
            value={adjustForm.type}
            onChange={(v) => setAdjustForm(f => ({ ...f, type: v }))}
            options={TYPE_OPTIONS}
            fullWidth
          />
          <Input
            label="Quantity"
            type="number"
            value={adjustForm.quantity || ''}
            onChange={(e) => setAdjustForm(f => ({ ...f, quantity: Number(e.target.value) }))}
            placeholder="0"
          />
          <Textarea
            label="Notes (optional)"
            value={adjustForm.notes}
            onChange={(e) => setAdjustForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Reason for adjustment…"
            rows={3}
          />
          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
