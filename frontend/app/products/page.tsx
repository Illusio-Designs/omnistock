'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { productApi } from '@/lib/api';
import { useFilteredBySearch } from '@/lib/useGlobalSearch';
import {
  Button, Card, Modal, Input, Textarea, Select, Pagination, FileUpload, Tooltip, EmptyState,
} from '@/components/ui';
import { Plus, Package, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, pageSize],
    queryFn: () => productApi.list({ page, limit: pageSize }).then(r => r.data),
  });

  // Topbar global search — filters by name, sku, brand, category.
  const filteredProducts = useFilteredBySearch(data?.products, (p: any) =>
    `${p.name || ''} ${p.sku || ''} ${p.brand?.name || ''} ${p.category?.name || ''} ${p.barcode || ''}`
  );

  const syncMutation = useMutation({
    mutationFn: (id: string) => productApi.syncChannels(id),
    onMutate: (id) => setSyncingId(id),
    onSuccess: (res) => {
      setSyncingId(null);
      setSyncResult({ type: 'success', message: `Pushed to ${res.data.updated} channels · ${res.data.skipped} skipped · ${res.data.failed} failed` });
      setTimeout(() => setSyncResult(null), 5000);
    },
    onError: (err: any) => {
      setSyncingId(null);
      setSyncResult({ type: 'error', message: err.response?.data?.error || err.message });
      setTimeout(() => setSyncResult(null), 5000);
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-5 animate-slide-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#06D4B8] to-[#06B6D4] bg-clip-text text-transparent tracking-tight">Products</h1>
            <p className="text-sm text-slate-500 mt-1">{data?.total || 0} total products</p>
          </div>
          <Button leftIcon={<Plus size={15} />} onClick={() => setModalOpen(true)}>
            Add Product
          </Button>
        </div>

        {syncResult && (
          <div className={`flex items-start gap-2 rounded-xl p-3 text-sm border ${
            syncResult.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {syncResult.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            <span>{syncResult.message}</span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="p-4 animate-shimmer h-64" />
            ))}
          </div>
        ) : data?.products?.length ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((p: any) => (
                <Card key={p.id} className="p-4 hover:shadow-lg transition-shadow flex flex-col">
                  <Link href={`/products/${p.id}`} className="flex-1">
                    <div className="w-full h-32 bg-slate-50 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                      {p.images?.[0] ? (
                        <Image
                          src={p.images[0]}
                          alt={p.name}
                          width={400}
                          height={256}
                          className="w-full h-full object-cover"
                          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          unoptimized={p.images[0].startsWith('data:')}
                        />
                      ) : (
                        <Package size={32} className="text-slate-300" />
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm truncate">{p.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">SKU: {p.sku}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-500">{p.variants?.length || 0} variant{p.variants?.length !== 1 ? 's' : ''}</span>
                      <span className="text-xs font-semibold text-slate-700">{p.category?.name || '—'}</span>
                    </div>
                  </Link>
                  <Tooltip content="Push this product to all connected channels">
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      loading={syncingId === p.id}
                      leftIcon={<RefreshCw size={12} />}
                      onClick={() => syncMutation.mutate(p.id)}
                      className="mt-3"
                    >
                      {syncingId === p.id ? 'Syncing…' : 'Sync to Channels'}
                    </Button>
                  </Tooltip>
                </Card>
              ))}
            </div>

            {(data?.total || 0) > pageSize && (
              <Card>
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={data.total}
                  onPageChange={setPage}
                  onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                />
              </Card>
            )}
          </>
        ) : (
          <Card>
            <EmptyState
              icon={<Package size={28} />}
              iconBg="bg-emerald-50 text-emerald-600"
              title="No products yet"
              description="Add your first product to start selling."
              action={
                <Button leftIcon={<Plus size={14} />} onClick={() => setModalOpen(true)}>
                  Add Product
                </Button>
              }
              size="lg"
            />
          </Card>
        )}
      </div>

      <NewProductModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </DashboardLayout>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// New Product Modal
// ═══════════════════════════════════════════════════════════════════════════
function NewProductModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '', sku: '', barcode: '', description: '',
    costPrice: '', mrp: '', sellingPrice: '', categoryId: '', brandId: '', weight: '',
  });
  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => productApi.categories().then(r => r.data),
    enabled: open,
  });
  const { data: brands } = useQuery({
    queryKey: ['brands-list'],
    queryFn: () => productApi.brands().then(r => r.data),
    enabled: open,
  });

  const categoryOptions = (categories || []).map((c: any) => ({ value: c.id, label: c.name }));
  const brandOptions = (brands || []).map((b: any) => ({ value: b.id, label: b.name }));

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

  const createMutation = useMutation({
    mutationFn: async () => {
      const imageUrls = images.length ? await Promise.all(images.map(toBase64)) : undefined;
      return productApi.create({
        name: form.name,
        sku: form.sku,
        barcode: form.barcode || undefined,
        description: form.description || undefined,
        categoryId: form.categoryId || undefined,
        brandId: form.brandId || undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        images: imageUrls,
        variants: [{
          sku: form.sku,
          name: 'Default',
          attributes: {},
          costPrice: Number(form.costPrice || 0),
          mrp: Number(form.mrp || 0),
          sellingPrice: Number(form.sellingPrice || 0),
        }],
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      reset();
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.error || err.message),
  });

  const reset = () => {
    setForm({
      name: '', sku: '', barcode: '', description: '',
      costPrice: '', mrp: '', sellingPrice: '', categoryId: '', brandId: '', weight: '',
    });
    setImages([]);
    setError('');
  };

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); reset(); }}
      title="Add New Product"
      description="Create a product to list across your channels"
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={() => { onClose(); reset(); }}>Cancel</Button>
          <Button
            onClick={() => { setError(''); createMutation.mutate(); }}
            loading={createMutation.isPending}
            disabled={!form.name || !form.sku}
          >
            Create Product
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Product Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Premium Cotton T-Shirt"
          />
          <Input
            label="SKU"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            placeholder="e.g. TSH-001"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Barcode (optional)"
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            placeholder="e.g. 8901234567890"
          />
          <Input
            label="Weight (kg)"
            type="number"
            value={form.weight}
            onChange={(e) => setForm({ ...form, weight: e.target.value })}
            placeholder="0.5"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            label="Category"
            value={form.categoryId}
            onChange={(v) => setForm({ ...form, categoryId: v })}
            options={categoryOptions}
            placeholder="Select category…"
            fullWidth
          />
          <Select
            label="Brand"
            value={form.brandId}
            onChange={(v) => setForm({ ...form, brandId: v })}
            options={brandOptions}
            placeholder="Select brand…"
            fullWidth
          />
        </div>

        <Textarea
          label="Description (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Describe your product…"
          rows={3}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Cost Price"
            type="number"
            value={form.costPrice}
            onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
            placeholder="0.00"
          />
          <Input
            label="MRP"
            type="number"
            value={form.mrp}
            onChange={(e) => setForm({ ...form, mrp: e.target.value })}
            placeholder="0.00"
          />
          <Input
            label="Selling Price"
            type="number"
            value={form.sellingPrice}
            onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
            placeholder="0.00"
          />
        </div>

        <FileUpload
          label="Product Images"
          accept="image/*"
          multiple
          maxSize={5 * 1024 * 1024}
          value={images}
          onChange={setImages}
          hint="PNG, JPG, WebP — up to 5MB each"
        />

        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      </div>
    </Modal>
  );
}
