'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import {
  Sparkles, Search, ArrowRight, Rocket, Plug, Package, ShoppingCart, Truck,
  Settings, CreditCard,
} from 'lucide-react';

const CATEGORIES = [
  { icon: Rocket,      title: 'Getting Started', count: 12, color: 'emerald' },
  { icon: Plug,        title: 'Integrations',    count: 24 },
  { icon: Package,     title: 'Products',        count: 18 },
  { icon: ShoppingCart,title: 'Orders',          count: 22 },
  { icon: Truck,       title: 'Shipping',        count: 16 },
  { icon: CreditCard,  title: 'Billing',         count: 8  },
  { icon: Settings,    title: 'Settings',        count: 10 },
];

const POPULAR = [
  'How do I connect Amazon Seller Central?',
  'How do I map SKUs between channels?',
  'How do I push inventory to all channels at once?',
  'How does auto review request work?',
  'Can I use OmniStock with my existing Shopify store?',
  'How do I cancel a shipment?',
];

export default function HelpPage() {
  const [q, setQ] = useState('');

  return (
    <PublicLayout>
      <section className="relative overflow-hidden pt-20 pb-16">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-white" />
        <div className="absolute top-20 left-1/3 w-96 h-96 rounded-full bg-emerald-200/40 blur-[120px] -z-10" />

        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">
            <Sparkles size={12} /> Help Center
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
            How can we <span className="gradient-text">help?</span>
          </h1>

          <div className="mt-8 relative max-w-xl mx-auto">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search articles, guides, tutorials…"
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-lg text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 placeholder:text-slate-400"
            />
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Browse by category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CATEGORIES.map(c => {
              const Icon = c.icon;
              return (
                <div key={c.title} className="p-5 bg-white border border-slate-200 rounded-2xl hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center mb-3 group-hover:bg-emerald-100 transition-colors">
                    <Icon size={18} className="text-emerald-600" />
                  </div>
                  <div className="font-bold text-slate-900 text-sm">{c.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{c.count} articles</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Popular articles</h2>
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
            {POPULAR.map(p => (
              <a key={p} href="#" className="flex items-center justify-between p-5 hover:bg-emerald-50/30 transition-colors group">
                <span className="text-sm font-semibold text-slate-700 group-hover:text-emerald-700">{p}</span>
                <ArrowRight size={14} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </a>
            ))}
          </div>
          <div className="text-center mt-10">
            <p className="text-slate-600 mb-4">Can't find what you're looking for?</p>
            <Link href="/contact" className="btn-primary">Contact Support <ArrowRight size={14} /></Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
