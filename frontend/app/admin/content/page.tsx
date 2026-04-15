'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Plus, Edit2, Trash2, Save, X, Eye, EyeOff, GripVertical } from 'lucide-react';

const TYPES = [
  { value: 'LANDING_CHALLENGE',    label: 'Landing — Challenges' },
  { value: 'LANDING_FEATURE_TOOL', label: 'Landing — Feature Tools' },
  { value: 'LANDING_FAQ',          label: 'Landing — FAQs' },
  { value: 'FEATURE',              label: 'Features page' },
  { value: 'SOLUTION',             label: 'Solutions page' },
  { value: 'ABOUT_SECTION',        label: 'About — Sections' },
  { value: 'ABOUT_VALUE',          label: 'About — Values' },
  { value: 'ABOUT_TIMELINE',       label: 'About — Timeline' },
  { value: 'HELP_CATEGORY',        label: 'Help — Categories' },
  { value: 'HELP_FAQ',             label: 'Help — FAQs' },
  { value: 'RESOURCE_TILE',        label: 'Resources — Tiles' },
  { value: 'VIDEO',                label: 'Videos' },
  { value: 'CASE_STUDY',           label: 'Case Studies' },
  { value: 'TESTIMONIAL',          label: 'Testimonials' },
  { value: 'HERO',                 label: 'Landing — Hero' },
  { value: 'NAV_LINK',             label: 'Navigation links' },
  { value: 'FOOTER_LINK',          label: 'Footer links' },
];

export default function AdminContentPage() {
  const [activeType, setActiveType] = useState<string>('LANDING_CHALLENGE');
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.content(activeType);
      setItems(r.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [activeType]);

  const save = async (data: any) => {
    if (data.id) {
      await adminApi.updateContent(data.id, { ...data, type: activeType });
    } else {
      await adminApi.createContent({ ...data, type: activeType });
    }
    setEditing(null);
    setShowNew(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this content item?')) return;
    await adminApi.deleteContent(id);
    load();
  };

  const toggle = async (item: any) => {
    await adminApi.updateContent(item.id, { isActive: !item.isActive });
    load();
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Content Manager</h1>
        <p className="text-slate-500 mt-1">Edit the copy shown on every public marketing page.</p>
      </div>

      {/* Type picker */}
      <div className="mb-6">
        <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Content type</label>
        <select
          value={activeType}
          onChange={(e) => setActiveType(e.target.value)}
          className="w-full md:w-96 px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-500">
          {loading ? 'Loading…' : `${items.length} items`}
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600"
        >
          <Plus size={16} /> Add item
        </button>
      </div>

      {(showNew || editing) && (
        <ContentForm
          initial={editing}
          type={activeType}
          onClose={() => { setEditing(null); setShowNew(false); }}
          onSave={save}
        />
      )}

      <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
        {items.length === 0 && !loading && (
          <div className="p-12 text-center text-slate-400 text-sm">
            No items yet. Click "Add item" to create your first.
          </div>
        )}
        {items.map((item) => (
          <div key={item.id} className="p-5 flex items-start gap-4">
            <GripVertical size={16} className="text-slate-300 mt-1 flex-shrink-0 cursor-grab" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900">{item.title}</h3>
                {item.category && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase">{item.category}</span>
                )}
                {!item.isActive && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 uppercase">Hidden</span>
                )}
                <span className="text-[10px] font-mono text-slate-400">#{item.sortOrder}</span>
              </div>
              {item.subtitle && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{item.subtitle}</p>}
              {item.body && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.body}</p>}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggle(item)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                title={item.isActive ? 'Hide' : 'Show'}
              >
                {item.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button
                onClick={() => setEditing(item)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => del(item.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContentForm({ initial, type, onClose, onSave }: any) {
  const [f, setF] = useState<any>(
    initial || {
      title: '',
      subtitle: '',
      body: '',
      icon: '',
      image: '',
      category: '',
      href: '',
      sortOrder: 0,
      isActive: true,
      data: {},
    }
  );
  const [dataJson, setDataJson] = useState(JSON.stringify(initial?.data || {}, null, 2));
  const [jsonError, setJsonError] = useState('');

  const submit = () => {
    let data;
    try { data = JSON.parse(dataJson || '{}'); }
    catch { setJsonError('Invalid JSON in data field'); return; }
    setJsonError('');
    onSave({ ...f, data });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">{initial ? 'Edit content' : 'New content'} · <span className="font-mono text-sm text-slate-500">{type}</span></h2>
        <button onClick={onClose}><X size={18} /></button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Title" value={f.title} onChange={(v: string) => setF({ ...f, title: v })} className="col-span-2" />
        <Input label="Subtitle" value={f.subtitle || ''} onChange={(v: string) => setF({ ...f, subtitle: v })} className="col-span-2" />
        <Textarea label="Body (markdown)" value={f.body || ''} onChange={(v: string) => setF({ ...f, body: v })} className="col-span-2" rows={5} />
        <Input label="Icon (lucide name)" value={f.icon || ''} onChange={(v: string) => setF({ ...f, icon: v })} placeholder="Sparkles" />
        <Input label="Image URL" value={f.image || ''} onChange={(v: string) => setF({ ...f, image: v })} />
        <Input label="Category" value={f.category || ''} onChange={(v: string) => setF({ ...f, category: v })} />
        <Input label="Link href" value={f.href || ''} onChange={(v: string) => setF({ ...f, href: v })} />
        <Input label="Sort order" type="number" value={f.sortOrder ?? 0} onChange={(v: string) => setF({ ...f, sortOrder: Number(v) })} />
        <label className="flex items-center gap-2 mt-6 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} />
          Active (visible on the public site)
        </label>
      </div>

      <div className="mt-4">
        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Extra fields (JSON)</label>
        <textarea
          value={dataJson}
          onChange={(e) => setDataJson(e.target.value)}
          rows={5}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs"
        />
        {jsonError && <p className="text-xs text-red-600 mt-1">{jsonError}</p>}
        <p className="text-[10px] text-slate-400 mt-1">
          Per-type structured fields. E.g. videos: <code>{'{ "duration": "5:12", "url": "..." }'}</code>
        </p>
      </div>

      <div className="flex gap-2 justify-end mt-5">
        <button onClick={onClose} className="px-4 py-2 text-slate-600">Cancel</button>
        <button onClick={submit} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600">
          <Save size={14} /> Save
        </button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', className = '', placeholder }: any) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
      />
    </div>
  );
}

function Textarea({ label, value, onChange, className = '', rows = 4 }: any) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <textarea
        value={value ?? ''}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-sm font-mono"
      />
    </div>
  );
}
