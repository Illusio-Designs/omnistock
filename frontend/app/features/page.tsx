'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { publicApi } from '@/lib/api';
import { getIcon } from '@/lib/icon';
import { Sparkles, ArrowRight } from 'lucide-react';

interface Feature {
  id: string;
  title: string;
  subtitle: string | null;
  icon: string | null;
  category: string | null;
}

export default function FeaturesPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi.content('FEATURE')
      .then((r) => setFeatures(r.data || []))
      .finally(() => setLoading(false));
  }, []);

  const grouped: Record<string, Feature[]> = {};
  for (const f of features) {
    const k = f.category || 'Features';
    (grouped[k] ||= []).push(f);
  }
  const categories = Object.keys(grouped);

  return (
    <PublicLayout>
      <section className="relative overflow-hidden pt-20 pb-12">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-white" />
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">
            <Sparkles size={12} /> Features
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
            Everything you need to<br />
            <span className="gradient-text">run commerce.</span>
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            One platform for multi-channel inventory, orders, warehousing, finance and analytics.
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : features.length === 0 ? (
            <div className="text-center py-24">
              <h2 className="text-xl font-bold text-slate-900">No features listed yet</h2>
              <p className="text-slate-500 mt-2">A platform admin can add features at /admin/content.</p>
            </div>
          ) : (
            categories.map((cat) => (
              <div key={cat} className="mb-12">
                {categories.length > 1 && (
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">{cat}</h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {grouped[cat].map((f) => {
                    const Icon = getIcon(f.icon);
                    return (
                      <div key={f.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:border-emerald-300 hover:shadow-lg transition-all">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                          <Icon size={18} className="text-emerald-600" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-900">{f.title}</h3>
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">{f.subtitle}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-full shadow-lg shadow-emerald-500/30"
          >
            Start free trial <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
