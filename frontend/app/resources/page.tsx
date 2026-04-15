'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { publicApi } from '@/lib/api';
import { getIcon } from '@/lib/icon';
import { Sparkles, ArrowRight } from 'lucide-react';

interface Tile {
  id: string;
  title: string;
  subtitle: string | null;
  icon: string | null;
  href: string | null;
  data: any;
}

export default function ResourcesPage() {
  const [tiles, setTiles] = useState<Tile[]>([]);

  useEffect(() => {
    publicApi.content('RESOURCE_TILE').then((r) => setTiles(r.data || []));
  }, []);

  return (
    <PublicLayout>
      <section className="relative overflow-hidden pt-20 pb-12">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-white" />
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">
            <Sparkles size={12} /> Resources
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
            Learn. Build. <span className="gradient-text">Scale.</span>
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            Guides, tutorials, case studies, and product updates — everything you need to succeed with OmniStock.
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-6">
          {tiles.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-52 bg-slate-100 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {tiles.map((t) => {
                const Icon = getIcon(t.icon);
                const gradient = t.data?.gradient || 'from-emerald-400 to-teal-600';
                return (
                  <Link
                    key={t.id}
                    href={t.href || '#'}
                    className="group bg-white rounded-3xl border border-slate-200 overflow-hidden hover:border-emerald-300 hover:shadow-xl transition-all"
                  >
                    <div className={`h-32 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                      <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                        <Icon size={24} className="text-white" />
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-bold text-lg text-slate-900 group-hover:text-emerald-700 transition-colors">{t.title}</h3>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed line-clamp-2">{t.subtitle}</p>
                      <div className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                        Explore <ArrowRight size={12} />
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
