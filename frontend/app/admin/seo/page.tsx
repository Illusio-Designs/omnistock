'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Save, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function AdminSeoPage() {
  const [list, setList] = useState<any[]>([]);
  const [draft, setDraft] = useState<any>({ path: '', title: '', description: '', keywords: '', robots: 'index,follow' });

  const load = () => adminApi.seo().then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const save = async (item: any) => {
    await adminApi.upsertSeo(item); load();
  };
  const del = async (id: string) => {
    if (!confirm('Delete?')) return;
    await adminApi.deleteSeo(id); load();
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-900">SEO Settings</h1>
      <p className="text-slate-500 mt-1">Per-page meta tags rendered into your public site.</p>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 mt-6">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Plus size={16} /> Add / update path</h2>
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
        <Button
          variant="primary"
          leftIcon={<Save size={14} />}
          className="mt-4"
          onClick={() => { save(draft); setDraft({ path: '', title: '', description: '', keywords: '', robots: 'index,follow' }); }}
        >
          Save
        </Button>
      </div>

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
                <td className="p-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setDraft(s)} className="mr-2">Edit</Button>
                  <Button variant="danger" size="icon" onClick={() => del(s.id)}><Trash2 size={14} /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
