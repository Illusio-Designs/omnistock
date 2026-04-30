'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { publicApi } from '@/lib/api';
import { getIcon } from '@/lib/icon';
import { HelpCircle, Search, ArrowRight } from 'lucide-react';

interface Row {
  id: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  icon: string | null;
  category: string | null;
  href: string | null;
}

function HelpCenterInner() {
  const params = useSearchParams();
  const topic = params.get('topic') || '';
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<Row[]>([]);
  const [faqs, setFaqs] = useState<Row[]>([]);

  useEffect(() => {
    publicApi.content('HELP_CATEGORY').then((r) => setCategories(r.data || []));
    publicApi.content('HELP_FAQ').then((r) => setFaqs(r.data || []));
  }, []);

  const filteredFaqs = faqs
    .filter((f) => (topic ? f.category === topic : true))
    .filter((f) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        f.title.toLowerCase().includes(q) ||
        (f.body || '').toLowerCase().includes(q)
      );
    });

  return (
    <PublicLayout>
      <section className="relative overflow-hidden pt-20 pb-12">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-white" />
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">
            <HelpCircle size={12} /> Help center
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-[#06D4B8] to-[#06B6D4] bg-clip-text text-transparent leading-tight">
            How can we <span className="gradient-text">help?</span>
          </h1>
          <div className="relative max-w-xl mx-auto mt-8">
            <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search articles…"
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-lg text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      {!topic && !query && categories.length > 0 && (
        <section className="pb-12">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Browse by topic</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((c) => {
                const Icon = getIcon(c.icon);
                return (
                  <Link
                    key={c.id}
                    href={c.href || '#'}
                    className="p-5 bg-white border border-slate-200 rounded-2xl hover:border-emerald-300 hover:shadow-lg transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                      <Icon size={18} className="text-emerald-600" />
                    </div>
                    <h3 className="font-bold text-slate-900">{c.title}</h3>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{c.subtitle}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* FAQs */}
      <section className="pb-24">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            {topic ? `Articles: ${topic}` : query ? `Results for "${query}"` : 'Frequently asked'}
          </h2>
          {filteredFaqs.length === 0 ? (
            <p className="text-slate-500">No articles match your search.</p>
          ) : (
            <div className="space-y-2">
              {filteredFaqs.map((f) => (
                <details key={f.id} className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-emerald-200 transition-colors">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none">
                    <span className="text-sm font-bold text-slate-900 pr-4">{f.title}</span>
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 group-open:bg-emerald-100 flex items-center justify-center text-lg leading-none text-slate-600 group-open:text-emerald-700 group-open:rotate-45 transition-all">
                      +
                    </span>
                  </summary>
                  <div className="px-5 pb-4 -mt-1 text-sm text-slate-600 leading-relaxed">
                    {f.body}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

export default function HelpCenterPage() {
  return (
    <Suspense fallback={null}>
      <HelpCenterInner />
    </Suspense>
  );
}
