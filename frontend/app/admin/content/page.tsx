'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Plus, Edit2, Trash2, Save, Eye, EyeOff, GripVertical } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { EmptyState, useConfirm } from '@/components/ui';
import { FileText } from 'lucide-react';

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
  const [confirmUi, askConfirm] = useConfirm();

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
    const ok = await askConfirm({
      title: 'Delete this content item?',
      description: 'It will disappear from the public site immediately. This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    await adminApi.deleteContent(id);
    load();
  };

  const toggle = async (item: any) => {
    await adminApi.updateContent(item.id, { isActive: !item.isActive });
    load();
  };

  return (
    <div className="p-8">
      {confirmUi}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Content Manager</h1>
        <p className="text-slate-500 mt-1">Edit the copy shown on every public marketing page.</p>
      </div>

      {/* Type picker */}
      <div className="mb-6 w-full md:w-96">
        <Select
          label="Content type"
          value={activeType}
          onChange={(v) => setActiveType(v)}
          options={TYPES.map((t) => ({ value: t.value, label: t.label }))}
          fullWidth
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-500">
          {loading ? 'Loading…' : `${items.length} items`}
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setShowNew(true)}>
          Add item
        </Button>
      </div>

      <Modal
        open={showNew || !!editing}
        onClose={() => { setEditing(null); setShowNew(false); }}
        title={editing ? 'Edit content' : 'New content'}
        description={activeType}
        size="xl"
      >
        <ContentForm
          initial={editing}
          type={activeType}
          onClose={() => { setEditing(null); setShowNew(false); }}
          onSave={save}
        />
      </Modal>

      <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
        {items.length === 0 && !loading && (
          <EmptyState
            icon={<FileText size={24} />}
            iconBg="bg-slate-100 text-slate-500"
            title="No items yet"
            description='Click "Add item" to create your first.'
          />
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
              <Tooltip content={item.isActive ? 'Hide' : 'Show'}>
                <Button variant="ghost" size="icon" onClick={() => toggle(item)}>
                  {item.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                </Button>
              </Tooltip>
              <Tooltip content="Edit content">
                <Button variant="ghost" size="icon" onClick={() => setEditing(item)}>
                  <Edit2 size={14} />
                </Button>
              </Tooltip>
              <Tooltip content="Delete content">
                <Button variant="danger" size="icon" onClick={() => del(item.id)}>
                  <Trash2 size={14} />
                </Button>
              </Tooltip>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContentForm({ initial, type, onClose, onSave }: {
  initial: any;
  type: string;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
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
    <div>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input label="Title" value={f.title ?? ''} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </div>
        <div className="col-span-2">
          <Input label="Subtitle" value={f.subtitle ?? ''} onChange={(e) => setF({ ...f, subtitle: e.target.value })} />
        </div>
        <div className="col-span-2">
          <Textarea label="Body (markdown)" value={f.body ?? ''} onChange={(e) => setF({ ...f, body: e.target.value })} rows={5} />
        </div>
        <Input label="Icon (lucide name)" value={f.icon ?? ''} onChange={(e) => setF({ ...f, icon: e.target.value })} placeholder="Sparkles" />
        <Input label="Image URL" value={f.image ?? ''} onChange={(e) => setF({ ...f, image: e.target.value })} />
        <Input label="Category" value={f.category ?? ''} onChange={(e) => setF({ ...f, category: e.target.value })} />
        <Input label="Link href" value={f.href ?? ''} onChange={(e) => setF({ ...f, href: e.target.value })} />
        <Input label="Sort order" type="number" value={f.sortOrder ?? 0} onChange={(e) => setF({ ...f, sortOrder: Number(e.target.value) })} />
        <div className="flex items-center mt-6">
          <Checkbox
            checked={!!f.isActive}
            onCheckedChange={(c) => setF({ ...f, isActive: c })}
            label="Active (visible on the public site)"
          />
        </div>
      </div>

      <div className="mt-4">
        <Textarea
          label="Extra fields (JSON)"
          value={dataJson}
          onChange={(e) => setDataJson(e.target.value)}
          rows={5}
          className="font-mono text-xs"
          error={jsonError || undefined}
        />
        <p className="text-[10px] text-slate-400 mt-1">
          Per-type structured fields. E.g. videos: <code>{'{ "duration": "5:12", "url": "..." }'}</code>
        </p>
      </div>

      <div className="flex gap-2 justify-end mt-5">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" leftIcon={<Save size={14} />} onClick={submit}>Save</Button>
      </div>
    </div>
  );
}
