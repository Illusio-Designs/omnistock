'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Save, Plus, Trash2 } from 'lucide-react';

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
          <Input label="Path (e.g. /pricing)" value={draft.path} onChange={(v) => setDraft({ ...draft, path: v })} />
          <Input label="Title" value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} />
          <Input label="Description" value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} className="col-span-2" />
          <Input label="Keywords" value={draft.keywords} onChange={(v) => setDraft({ ...draft, keywords: v })} className="col-span-2" />
          <Input label="OG Title" value={draft.ogTitle || ''} onChange={(v) => setDraft({ ...draft, ogTitle: v })} />
          <Input label="OG Image" value={draft.ogImage || ''} onChange={(v) => setDraft({ ...draft, ogImage: v })} />
          <Input label="Robots" value={draft.robots} onChange={(v) => setDraft({ ...draft, robots: v })} />
          <Input label="Canonical URL" value={draft.canonicalUrl || ''} onChange={(v) => setDraft({ ...draft, canonicalUrl: v })} />
        </div>
        <button onClick={() => { save(draft); setDraft({ path: '', title: '', description: '', keywords: '', robots: 'index,follow' }); }}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-semibold">
          <Save size={14} /> Save
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl mt-6 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="text-left p-3">Path</th>
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">Robots</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="p-3 font-mono text-xs">{s.path}</td>
                <td className="p-3">{s.title}</td>
                <td className="p-3 text-xs text-slate-500">{s.robots}</td>
                <td className="p-3 text-right">
                  <button onClick={() => setDraft(s)} className="text-slate-500 mr-2">Edit</button>
                  <button onClick={() => del(s.id)} className="text-red-500"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, className = '' }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input value={value ?? ''} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-200" />
    </div>
  );
}
