'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicLayout, usePublicLoading } from '@/components/layout/PublicLayout';
import { publicApi } from '@/lib/api';
import { getIcon } from '@/lib/icon';
import { Sparkles, ArrowRight } from 'lucide-react';

interface Solution {
  id: string;
  title: string;
  subtitle: string | null;
  icon: string | null;
  href: string | null;
  data: any;
}

export default function SolutionsPage() {
  const [items, setItems] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  usePublicLoading('solutions', loading);

  useEffect(() => {
    publicApi.content('SOLUTION')
      .then((r) => setItems(r.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PublicLayout>
      <section className="relative overflow-hidden pt-20 pb-12">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-white" />
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">
            <Sparkles size={12} /> Solutions
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-[#06D4B8] to-[#06B6D4] bg-clip-text text-transparent leading-tight">
            Built for your<br />
            <span className="gradient-text">business model.</span>
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            D2C, marketplaces, quick commerce, 3PL — one platform, every commerce playbook.
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-56 bg-slate-100 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-24 text-slate-500">
              <h2 className="text-xl font-bold text-slate-900 mb-2">No solutions listed yet</h2>
              A platform admin can add them at /admin/content.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((s) => {
                const Icon = getIcon(s.icon);
                const gradient = s.data?.gradient || 'from-emerald-400 to-teal-600';
                return (
                  <Link
                    key={s.id}
                    href={s.href || '#'}
                    className="group bg-white rounded-3xl border border-slate-200 overflow-hidden hover:border-emerald-300 hover:shadow-xl transition-all"
                  >
                    <div className={`relative h-32 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                      <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                        <Icon size={24} className="text-white" />
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-bold text-lg text-slate-900 group-hover:text-emerald-700 transition-colors">{s.title}</h3>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed">{s.subtitle}</p>
                      <div className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                        Learn more <ArrowRight size={12} />
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
