'use client';

import Link from 'next/link';
import { PublicLayout } from '@/components/layout/PublicLayout';
import {
  Sparkles, ArrowRight, Layers, Workflow, Truck, Star, Brain, ShieldCheck,
  TrendingUp, Package, BarChart3, Zap, Globe, Bell, Webhook, Users,
} from 'lucide-react';

const FEATURE_SECTIONS = [
  {
    eyebrow: 'Catalog Management',
    icon: Layers,
    title: 'One product. Every channel.',
    description: 'Edit a product once in OmniStock — title, price, stock, images, descriptions — and push it to every connected channel with a single click. Channel-specific prices, variant mappings, and warehouse-aware inventory aggregation are all built in.',
    bullets: [
      'Universal catalog with SKU & barcode mapping',
      'Channel-specific pricing & MRP',
      'Bulk sync across all connected channels',
      'Multi-warehouse stock aggregation',
    ],
    gradient: 'from-violet-500 to-indigo-600',
    side: 'left',
  },
  {
    eyebrow: 'Order Orchestration',
    icon: Workflow,
    title: 'All orders. One inbox.',
    description: 'Orders from 50+ channels land in one unified view. Accept, process, route, and ship from a single dashboard. Smart workflows auto-assign warehouses, trigger invoices, and update channels in real-time.',
    bullets: [
      'Unified order inbox across all channels',
      'Auto-accept & auto-route to warehouses',
      'Smart SLA tracking per channel',
      'Webhook-based instant order ingestion',
    ],
    gradient: 'from-emerald-500 to-teal-600',
    side: 'right',
  },
  {
    eyebrow: 'Smart Shipping',
    icon: Truck,
    title: '16+ logistics partners. One API.',
    description: 'Shiprocket, Delhivery, iThink, Pickrr, NimbusPost, ClickPost, Xpressbees, Shadowfax, BlueDart, DTDC, FedEx, DHL, UPS and more. Compare rates, book AWBs, schedule pickups, track shipments, and cancel — all from OmniStock.',
    bullets: [
      'Real-time rate comparison across couriers',
      'One-click AWB generation',
      'Automated pickup scheduling',
      'End-to-end shipment tracking',
    ],
    gradient: 'from-sky-500 to-indigo-600',
    side: 'left',
  },
  {
    eyebrow: 'Auto Review Requests',
    icon: Star,
    title: 'More reviews. On autopilot.',
    description: 'Configure a delay (default 72 hours) and OmniStock automatically triggers the review request API on each channel — Amazon SP-API solicitations, Flipkart, Meesho, and more. No manual follow-ups. No missed windows.',
    bullets: [
      'Configurable post-delivery delay',
      'Per-channel review API support',
      'Skip-if-already-requested logic',
      'Retry queue for failed requests',
    ],
    gradient: 'from-pink-500 to-fuchsia-600',
    side: 'right',
  },
  {
    eyebrow: 'AI Insights',
    icon: Brain,
    title: 'Built-in brain for your business.',
    description: 'Smart reorder suggestions based on sales velocity, demand forecasts per channel, anomaly alerts when sales drop, and AI-powered SKU recommendations. The data is already there — OmniStock makes sense of it.',
    bullets: [
      'Demand forecasting per channel',
      'Automated reorder alerts',
      'Anomaly detection on sales',
      'Ask AI in natural language',
    ],
    gradient: 'from-rose-500 to-pink-600',
    side: 'left',
  },
];

const MORE_FEATURES = [
  { icon: TrendingUp, title: 'Real-time Inventory',    description: 'Live stock sync across every channel — never oversell.' },
  { icon: Package,    title: 'Multi-warehouse',        description: 'Split stock across warehouses; auto-pick closest to buyer.' },
  { icon: BarChart3,  title: 'Advanced Reports',       description: 'Sales, SKU velocity, P&L per channel, GST-ready exports.' },
  { icon: Zap,        title: 'Webhook Ingestion',      description: 'Built-in universal webhook receiver with HMAC validation.' },
  { icon: Globe,      title: 'Global Support',         description: 'Multi-currency, multi-region, international couriers.' },
  { icon: Bell,       title: 'Smart Notifications',    description: 'Low stock, delivery issues, review triggers — all in one feed.' },
  { icon: Webhook,    title: 'Developer API',          description: 'REST API for building custom workflows and integrations.' },
  { icon: Users,      title: 'Team Roles',             description: 'Granular permissions — Super Admin, Manager, Staff, Accountant.' },
  { icon: ShieldCheck,title: 'Enterprise Security',    description: 'AES-256-GCM credential encryption. JWT auth. Audit logs.' },
];

export default function FeaturesPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-16">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-emerald-400/20 blur-[120px]" />
          <div className="absolute top-40 right-1/4 w-96 h-96 rounded-full bg-teal-400/20 blur-[120px]" />
        </div>

        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">
            <Sparkles size={12} /> Features
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
            The commerce stack <span className="gradient-text">Gen Z founders deserve.</span>
          </h1>
          <p className="mt-5 text-lg text-slate-600">
            Every tool you need to sell, ship, and scale on every channel — in one beautiful platform.
          </p>
        </div>
      </section>

      {/* Feature blocks */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6 space-y-24">
          {FEATURE_SECTIONS.map(f => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`grid grid-cols-1 md:grid-cols-2 gap-10 items-center ${
                  f.side === 'right' ? 'md:[&>:first-child]:order-2' : ''
                }`}
              >
                {/* Visual */}
                <div className={`relative rounded-3xl bg-gradient-to-br ${f.gradient} p-10 md:p-14 shadow-2xl shadow-slate-900/10 overflow-hidden min-h-[280px] flex items-center justify-center`}>
                  <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/5 blur-3xl translate-y-1/4 -translate-x-1/4" />
                  <div className="relative flex items-center justify-center w-32 h-32 rounded-3xl bg-white/15 backdrop-blur-sm border border-white/20 text-white shadow-2xl animate-float">
                    <Icon size={56} strokeWidth={1.5} />
                  </div>
                </div>

                {/* Text */}
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-4">
                    {f.eyebrow}
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
                    {f.title}
                  </h3>
                  <p className="mt-4 text-base text-slate-600 leading-relaxed">{f.description}</p>
                  <ul className="mt-6 space-y-2.5">
                    {f.bullets.map(b => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${f.gradient} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <span className="font-medium">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* More features grid */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
              And a whole lot <span className="gradient-text">more.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {MORE_FEATURES.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="card-premium p-6 group">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4 group-hover:from-emerald-100 group-hover:to-teal-100 transition-colors">
                    <Icon size={18} className="text-slate-700 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <h4 className="font-bold text-slate-900">{f.title}</h4>
                  <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
            Ready to see it <span className="gradient-text">in action?</span>
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
