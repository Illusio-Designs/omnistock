'use client';

import { useEffect, useState } from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { publicApi } from '@/lib/api';
import { Award, ArrowRight } from 'lucide-react';
import { CaseStudySkeleton } from '@/components/Shimmer';

interface CaseStudy {
  id: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  data: { industry?: string; region?: string; metric?: string; [k: string]: any };
}

export default function CasesPage() {
  const [cases, setCases] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi.content('CASE_STUDY')
      .then((r) => setCases(r.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PublicLayout>
      <section className="relative overflow-hidden pt-20 pb-12">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-white" />
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">
            <Award size={12} /> Case studies
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-[#06D4B8] to-[#06B6D4] bg-clip-text text-transparent leading-tight">
            Real brands, <span className="gradient-text">real results.</span>
          </h1>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-5xl mx-auto px-6">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <CaseStudySkeleton key={i} />
              ))}
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-24 text-slate-500">
              <h2 className="text-xl font-bold text-slate-900 mb-2">No case studies yet</h2>
              Admin can add them at /admin/content.
            </div>
          ) : (
            <div className="space-y-6">
              {cases.map((c) => (
                <article
                  key={c.id}
                  className="group bg-white rounded-3xl border border-slate-200 p-8 hover:border-emerald-300 hover:shadow-xl transition-all"
                >
                  <div className="flex flex-wrap gap-2 mb-3">
                    {c.data?.industry && (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wider">{c.data.industry}</span>
                    )}
                    {c.data?.region && (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">{c.data.region}</span>
                    )}
                    {c.data?.metric && (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 uppercase tracking-wider">⚡ {c.data.metric}</span>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{c.title}</h3>
                  {c.subtitle && <p className="text-slate-600 mt-2 text-lg">{c.subtitle}</p>}
                  {c.body && <p className="text-slate-600 mt-4 leading-relaxed">{c.body}</p>}
                  <div className="inline-flex items-center gap-1.5 mt-5 text-sm font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                    Read full story <ArrowRight size={13} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
