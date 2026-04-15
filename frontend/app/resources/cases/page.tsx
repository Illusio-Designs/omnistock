'use client';

import { PublicLayout } from '@/components/layout/PublicLayout';
import { Sparkles, ArrowRight, TrendingUp, Quote } from 'lucide-react';

const CASES = [
  {
    company: 'Bloom & Bee',
    industry: 'Beauty & Cosmetics',
    metric: '3x GMV',
    duration: '6 months',
    excerpt: 'Unified catalog across Amazon, Myntra, and Shopify tripled their monthly revenue.',
    quote: 'We went from juggling 6 seller panels to one dashboard. Order processing time dropped 70%.',
    author: 'Priya Mehta, Founder',
  },
  {
    company: 'Urbanly',
    industry: 'Apparel',
    metric: '+250%',
    duration: '4 months',
    excerpt: 'Automated Flipkart + Amazon sync helped reduce stockouts and boost conversion.',
    quote: 'Finally, an ERP that feels like a modern SaaS — not a 2005 spreadsheet.',
    author: 'Arjun Kapoor, Ops Head',
  },
  {
    company: 'Kale Kitchen',
    industry: 'Food & Grocery',
    metric: '5x Orders',
    duration: '3 months',
    excerpt: 'Launched on Blinkit, Zepto and Swiggy Instamart in one afternoon.',
    quote: 'Quick-commerce is a different beast, and OmniStock helped us crack it in weeks not months.',
    author: 'Rhea Shah, CEO',
  },
];

export default function CasesPage() {
  return (
    <PublicLayout>
      <section className="relative overflow-hidden pt-20 pb-12">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-white" />

        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">
            <Sparkles size={12} /> Case Studies
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
            Real brands, <span className="gradient-text">real results.</span>
          </h1>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-5xl mx-auto px-6 space-y-6">
          {CASES.map((c, i) => (
            <div key={i} className="bg-white rounded-3xl border border-slate-200 p-8 md:p-10 hover:shadow-lg transition-shadow">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Metric */}
                <div className="text-center md:text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-3">
                    <TrendingUp size={11} /> {c.duration}
                  </div>
                  <div className="text-5xl font-bold gradient-text">{c.metric}</div>
                  <div className="text-sm font-bold text-slate-900 mt-3">{c.company}</div>
                  <div className="text-xs text-slate-500">{c.industry}</div>
                </div>

                {/* Content */}
                <div className="md:col-span-2">
                  <p className="text-slate-700 leading-relaxed mb-4">{c.excerpt}</p>
                  <div className="flex gap-3 p-4 bg-emerald-50 rounded-xl">
                    <Quote size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-700 italic leading-relaxed">"{c.quote}"</p>
                      <div className="text-xs font-bold text-slate-900 mt-2">— {c.author}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
