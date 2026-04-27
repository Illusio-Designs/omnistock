'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Plus, Edit2, Trash2, Save } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);

  const load = () => adminApi.blog().then((r) => setPosts(r.data));
  useEffect(() => { load(); }, []);

  const save = async (data: any) => {
    if (data.id) await adminApi.updateBlog(data.id, data);
    else await adminApi.createBlog(data);
    setEditing(null); setShowNew(false); load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    await adminApi.deleteBlog(id); load();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Blog</h1>
          <p className="text-slate-500 mt-1">Manage articles for the public site.</p>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setShowNew(true)}>
          New post
        </Button>
      </div>

      <Modal
        open={showNew || !!editing}
        onClose={() => { setEditing(null); setShowNew(false); }}
        title={editing ? 'Edit post' : 'New post'}
        size="xl"
      >
        <BlogForm initial={editing} onClose={() => { setEditing(null); setShowNew(false); }} onSave={save} />
      </Modal>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="text-left p-3">#</th>
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">Slug</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Published</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p, idx) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="p-3 text-slate-500 font-semibold">{idx + 1}</td>
                <td className="p-3 font-semibold">{p.title}</td>
                <td className="p-3 font-mono text-xs text-slate-500">{p.slug}</td>
                <td className="p-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    p.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' :
                    p.status === 'DRAFT' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{p.status}</span>
                </td>
                <td className="p-3 text-xs text-slate-500">{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : '—'}</td>
                <td className="p-3 flex gap-2 justify-end">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(p)}>
                    <Edit2 size={14} />
                  </Button>
                  <Button variant="danger" size="icon" onClick={() => del(p.id)}>
                    <Trash2 size={14} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BlogForm({ initial, onClose, onSave }: {
  initial: any;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [f, setF] = useState<any>(initial || {
    slug: '', title: '', excerpt: '', content: '', authorName: '',
    status: 'DRAFT', metaTitle: '', metaDescription: '', metaKeywords: '',
  });

  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input label="Title" value={f.title ?? ''} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </div>
        <Input label="Slug"  value={f.slug ?? ''}  onChange={(e) => setF({ ...f, slug: e.target.value })} />
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
          <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, publishedAt: e.target.value === 'PUBLISHED' ? new Date() : f.publishedAt })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200">
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div className="col-span-2">
          <Input label="Excerpt" value={f.excerpt ?? ''} onChange={(e) => setF({ ...f, excerpt: e.target.value })} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Content (Markdown)</label>
          <textarea value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 h-40 font-mono text-sm" />
        </div>
        <Input label="Author" value={f.authorName ?? ''} onChange={(e) => setF({ ...f, authorName: e.target.value })} />
        <Input label="Cover image URL" value={f.coverImage ?? ''} onChange={(e) => setF({ ...f, coverImage: e.target.value })} />
        <div className="col-span-2">
          <Input label="Meta title" value={f.metaTitle ?? ''} onChange={(e) => setF({ ...f, metaTitle: e.target.value })} />
        </div>
        <div className="col-span-2">
          <Input label="Meta description" value={f.metaDescription ?? ''} onChange={(e) => setF({ ...f, metaDescription: e.target.value })} />
        </div>
      </div>
      <div className="mt-5 flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" leftIcon={<Save size={14} />} onClick={() => onSave(f)}>Save</Button>
      </div>
    </div>
  );
}
