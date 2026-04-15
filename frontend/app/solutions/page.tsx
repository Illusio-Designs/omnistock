'use client';

import Link from 'next/link';
import { PublicLayout } from '@/components/layout/PublicLayout';
import {
  Globe, Package, ShoppingCart, Warehouse, Truck, RefreshCcw, BarChart3,
  ArrowRight, CheckCircle2, Sparkles,
} from 'lucide-react';

const SOLUTIONS = [
  {
    id: 'multichannel',
    icon: Globe,
    title: 'Multi-channel Selling',
    tagline: 'List on 50+ marketplaces from one dashboard',
    description: 'Connect Amazon, Flipkart, Myntra, Meesho, Nykaa, Blinkit, Zepto, Shopify and more. Edit a product once — push to every channel.',
    bullets: ['50+ channels pre-integrated', 'Unified product catalog', 'Per-channel pricing', 'One-click bulk push'],
  },
  {
    id: 'inventory',
    icon: Package,
    title: 'Inventory Management',
    tagline: 'Real-time stock across every warehouse',
    description: 'Aggregate inventory across multiple warehouses. Auto-sync stock to every channel. Never oversell again.',
    bullets: ['Multi-warehouse aggregation', 'Real-time channel sync', 'Low-stock alerts', 'Automatic reorder points'],
  },
  {
    id: 'orders',
    icon: ShoppingCart,
    title: 'Order Management',
    tagline: 'All channel orders in one unified inbox',
    description: 'Every order from every channel lands in one inbox. Accept, route, ship, and track from a single dashboard.',
    bullets: ['Unified order inbox', 'Auto-routing to warehouses', 'SLA tracking per channel', 'Webhook-based ingestion'],
  },
  {
    id: 'warehouse',
    icon: Warehouse,
    title: 'Warehouse Operations',
    tagline: 'Pick, pack, ship from any location',
    description: 'Manage multiple fulfillment centers with location-aware inventory, pick-lists, barcode scanning, and stock movements.',
    bullets: ['Multi-location support', 'Barcode scanning', 'Stock movement logs', 'Batch fulfillment'],
  },
  {
    id: 'shipping',
    icon: Truck,
    title: 'Shipping & Logistics',
    tagline: '16+ courier partners in one API',
    description: 'Compare rates, book AWBs, schedule pickups, and track shipments across Shiprocket, Delhivery, iThink, Pickrr, and 12+ more.',
    bullets: ['Rate comparison', 'One-click AWB', 'Automated pickups', 'End-to-end tracking'],
  },
  {
    id: 'returns',
    icon: RefreshCcw,
    title: 'Returns & Refunds',
    tagline: 'Automated RMA workflows',
    description: 'Process returns across all channels from one screen. Auto-issue refunds, restock inventory, track QC.',
    bullets: ['Unified RMA inbox', 'Auto-refund workflow', 'Return reason analytics', 'Restock on approval'],
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'Reports & Analytics',
    tagline: 'AI-powered business insights',
    description: 'Sales by channel, SKU velocity, P&L per listing, demand forecasts, anomaly alerts — all in beautiful dashboards.',
    bullets: ['P&L per channel', 'SKU velocity reports', 'AI demand forecasts', 'GST-ready exports'],
  },
];

export default function SolutionsPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-16">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-white" />
        <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-emerald-200/40 blur-[120px] -z-10" />

        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">
            <Sparkles size={12} /> Solutions
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
            Everything you need to <span className="gradient-text">run commerce.</span>
          </h1>
          <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">
            From product listings to shipping labels — every workflow covered by one beautiful platform.
          </p>
        </div>
      </section>

      {/* Solutions grid */}
      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-6 space-y-6">
          {SOLUTIONS.map((s, i) => {
            const Icon = s.icon;
            const flip = i % 2 === 1;
            return (
              <div
                id={s.id}
                key={s.id}
                className={`scroll-mt-24 grid grid-cols-1 md:grid-cols-5 gap-6 bg-white rounded-3xl border border-slate-200 p-8 md:p-10 shadow-sm hover:shadow-lg transition-shadow ${
                  flip ? 'md:[&>:first-child]:order-2' : ''
                }`}
              >
                {/* Visual */}
                <div className="md:col-span-2 relative rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-10 md:p-12 overflow-hidden flex items-center justify-center min-h-[220px]">
                  <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/10 blur-2xl -translate-y-1/4 translate-x-1/4" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 blur-2xl translate-y-1/4 -translate-x-1/4" />
                  <div className="relative w-24 h-24 rounded-3xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shadow-2xl animate-float">
                    <Icon size={44} strokeWidth={1.5} />
                  </div>
                </div>

                {/* Content */}
                <div className="md:col-span-3 flex flex-col justify-center">
                  <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">
                    {s.tagline}
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{s.title}</h2>
                  <p className="mt-3 text-slate-600 leading-relaxed">{s.description}</p>
                  <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {s.bullets.map(b => (
                      <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className="font-medium">{b}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    <Link href="/dashboard" className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-full shadow-md transition-colors">
                      Try it free <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
            Ready to <span className="gradient-text">scale fearlessly?</span>
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/dashboard" className="btn-primary text-base px-6 py-3">
              Start Free <ArrowRight size={16} />
            </Link>
            <Link href="/pricing" className="btn-secondary text-base px-6 py-3">
              See Pricing
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
