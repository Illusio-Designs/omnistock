'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { publicApi } from '@/lib/api';
import { Sparkles, ArrowRight, Calendar, FileText } from 'lucide-react';

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  authorName: string | null;
  tags: string[] | any;
  publishedAt: string | null;
}

// Deterministic gradient picker so every post gets a pleasant cover
// without storing an image URL in the DB.
const GRADIENTS = [
  'from-emerald-400 to-teal-600',
  'from-emerald-500 to-green-600',
  'from-teal-400 to-emerald-600',
  'from-emerald-400 to-emerald-700',
  'from-green-400 to-teal-600',
  'from-emerald-500 to-teal-500',
];
const gradientFor = (slug: string) => {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
};

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi.blog()
      .then((r) => setPosts(r.data || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PublicLayout>
      <section className="relative overflow-hidden pt-20 pb-12">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-white" />

        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">
            <Sparkles size={12} /> Blog
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
            Commerce insights &<br />
            <span className="gradient-text">growth playbooks.</span>
          </h1>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-3xl border border-slate-200 overflow-hidden animate-pulse">
                  <div className="h-44 bg-slate-100" />
                  <div className="p-6 space-y-3">
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-full" />
                    <div className="h-3 bg-slate-100 rounded w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-24">
              <div className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-slate-100 mb-4">
                <FileText size={22} className="text-slate-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">No posts yet</h2>
              <p className="text-slate-500 mt-2 max-w-md mx-auto">
                The platform team hasn't published anything yet. Check back soon — or create your first post in the admin panel.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((p) => {
                const tags: string[] = Array.isArray(p.tags)
                  ? p.tags
                  : (typeof p.tags === 'string' ? [p.tags] : []);
                const category = tags[0] || 'Article';
                const gradient = gradientFor(p.slug);
                return (
                  <Link
                    key={p.id}
                    href={`/resources/blog/${p.slug}`}
                    className="group bg-white rounded-3xl border border-slate-200 overflow-hidden hover:border-emerald-300 hover:shadow-xl transition-all"
                  >
                    <div
                      className={`relative h-44 bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}
                      style={p.coverImage ? { backgroundImage: `url(${p.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                    >
                      {!p.coverImage && (
                        <>
                          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 blur-2xl -translate-y-1/2 translate-x-1/2" />
                          <div className="relative text-white text-5xl font-bold opacity-20 group-hover:scale-110 transition-transform">
                            ✨
                          </div>
                        </>
                      )}
                      <span className="absolute top-4 left-4 px-3 py-1 bg-white/25 backdrop-blur text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                        {category}
                      </span>
                    </div>
                    <div className="p-6">
                      <h3 className="font-bold text-lg text-slate-900 leading-snug group-hover:text-emerald-700 transition-colors line-clamp-2">
                        {p.title}
                      </h3>
                      {p.excerpt && (
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed line-clamp-2">{p.excerpt}</p>
                      )}
                      <div className="flex items-center gap-3 mt-5 pt-5 border-t border-slate-100 text-xs text-slate-500">
                        <div className="flex items-center gap-1"><Calendar size={11} /> {fmtDate(p.publishedAt)}</div>
                        {p.authorName && <div className="truncate">{p.authorName}</div>}
                        <ArrowRight size={12} className="ml-auto text-emerald-500 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
