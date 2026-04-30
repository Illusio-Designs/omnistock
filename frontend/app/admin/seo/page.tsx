'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Save, Plus, Trash2, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Tooltip } from '@/components/ui/Tooltip';
import { useConfirm } from '@/components/ui';

const EMPTY_DRAFT = {
  path: '',
  title: '',
  description: '',
  keywords: '',
  ogTitle: '',
  ogImage: '',
  robots: 'index,follow',
  canonicalUrl: '',
};

export default function AdminSeoPage() {
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [draft, setDraft] = useState<any>(EMPTY_DRAFT);
  const [confirmUi, askConfirm] = useConfirm();

  const load = () => adminApi.seo().then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const openNew = () => { setDraft(EMPTY_DRAFT); setEditing(null); setOpen(true); };
  const openEdit = (item: any) => { setDraft({ ...EMPTY_DRAFT, ...item }); setEditing(item); setOpen(true); };
  const close = () => { setOpen(false); setEditing(null); setDraft(EMPTY_DRAFT); };

  const save = async () => {
    await adminApi.upsertSeo(draft);
    close();
    load();
  };

  const del = async (id: string) => {
    const ok = await askConfirm({
      title: 'Delete this SEO entry?',
      description: 'The page will fall back to default meta tags. This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    await adminApi.deleteSeo(id);
    load();
  };

  return (
    <div className="p-8">
      {confirmUi}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#06D4B8] to-[#06B6D4] bg-clip-text text-transparent">SEO Settings</h1>
          <p className="text-slate-500 mt-1">Per-page meta tags rendered into your public site.</p>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openNew}>
          New entry
        </Button>
      </div>

      <Modal
        open={open}
        onClose={close}
        title={editing ? 'Edit SEO entry' : 'New SEO entry'}
        description={editing?.path}
        size="xl"
      >
        <div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Path (e.g. /pricing)" value={draft.path ?? ''} onChange={(e) => setDraft({ ...draft, path: e.target.value })} />
            <Input label="Title" value={draft.title ?? ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <div className="col-span-2">
              <Input label="Description" value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Input label="Keywords" value={draft.keywords ?? ''} onChange={(e) => setDraft({ ...draft, keywords: e.target.value })} />
            </div>
            <Input label="OG Title" value={draft.ogTitle ?? ''} onChange={(e) => setDraft({ ...draft, ogTitle: e.target.value })} />
            <Input label="OG Image" value={draft.ogImage ?? ''} onChange={(e) => setDraft({ ...draft, ogImage: e.target.value })} />
            <Input label="Robots" value={draft.robots ?? ''} onChange={(e) => setDraft({ ...draft, robots: e.target.value })} />
            <Input label="Canonical URL" value={draft.canonicalUrl ?? ''} onChange={(e) => setDraft({ ...draft, canonicalUrl: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button variant="primary" leftIcon={<Save size={14} />} onClick={save}>Save</Button>
          </div>
        </div>
      </Modal>

      <div className="bg-white border border-slate-200 rounded-2xl mt-6 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="text-left p-3">#</th>
              <th className="text-left p-3">Path</th>
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">Robots</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((s, idx) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="p-3 text-slate-500 font-semibold">{idx + 1}</td>
                <td className="p-3 font-mono text-xs">{s.path}</td>
                <td className="p-3">{s.title}</td>
                <td className="p-3 text-xs text-slate-500">{s.robots}</td>
                <td className="p-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Tooltip content="Edit">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                        <Pencil size={13} />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Delete">
                      <Button variant="danger" size="icon" onClick={() => del(s.id)}>
                        <Trash2 size={13} />
                      </Button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
