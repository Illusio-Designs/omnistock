'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { ChannelMarquee, ALL_CHANNELS } from '@/components/ChannelMarquee';
import { CountUp } from '@/components/CountUp';
import { publicApi } from '@/lib/api';
import {
  Sparkles, ArrowRight, Play, Users, Globe, Clock, Eye, AlertTriangle,
  Star,
} from 'lucide-react';

const BUSINESS_CHALLENGES = [
  {
    icon: Eye,
    title: 'Scattered Data',
    description: 'Managing massive amounts of data is overwhelming — disconnected sources and complex systems slow you down.',
    accent: false,
  },
  {
    icon: Clock,
    title: 'Manual Workflows',
    description: 'Teams spend hours on manual order processing, inventory updates, and reconciliation — time that should be spent scaling.',
    accent: true,
  },
  {
    icon: AlertTriangle,
    title: 'Missed Opportunities',
    description: 'Without the right tools, trends and insights get missed. Platforms like ours turn data into action.',
    accent: false,
  },
];

const FEATURE_TOOLS = [
  {
    title: 'AI-Powered Insights',
    description: 'Leverage cutting-edge AI to uncover hidden patterns and trends in your data, helping you make smarter, data-driven decisions with ease.',
    visual: 'chart',
  },
  {
    title: 'Real-Time Visibility',
    description: 'Interact with dynamic charts, graphs, and dashboards that update in real-time, offering instant clarity and actionable insights.',
    visual: 'bar',
    highlight: true,
  },
  {
    title: 'Easy Integration',
    description: "Seamlessly connect with 50+ tools like Amazon, Flipkart, Shopify and more — smooth data flow across all your favorite platforms.",
    visual: 'network',
  },
];

const FAQS = [
  {
    q: 'What types of channels can I connect?',
    a: 'Over 50+ channels including Amazon, Flipkart, Myntra, Meesho, Nykaa, Blinkit, Zepto, Swiggy Instamart, BB Now, Shopify, WooCommerce, Magento, and 16+ logistics providers like Shiprocket, Delhivery, iThink, Pickrr, NimbusPost, and ClickPost.',
  },
  {
    q: 'How secure is my data?',
    a: 'All credentials are encrypted at rest using AES-256-GCM encryption. Every request uses JWT authentication and HTTPS. You own your data — we never share it with third parties.',
  },
  {
    q: "What's the difference between Starter and Enterprise plans?",
    a: 'Starter is free forever with 3 channels and 500 orders/month. Growth (₹2,499/mo) unlocks unlimited channels and 10,000 orders/month. Scale (₹7,999/mo) adds AI forecasting and dedicated support.',
  },
  {
    q: 'How easy is it to get started?',
    a: 'Connect your first channel in under 5 minutes — no developers needed. Our setup wizard walks you through authentication, SKU mapping, and initial sync.',
  },
  {
    q: 'Can I integrate with my existing team tools?',
    a: 'Yes. OmniStock offers a REST API, webhooks, and native integrations with Slack, Gmail, and popular accounting platforms.',
  },
  {
    q: 'What support options are available?',
    a: 'Email support on all plans, priority support on Growth, and 24/7 dedicated account manager on Scale. Plus a full help center and community.',
  },
];

export default function LandingPage() {
  const [stats, setStats] = useState<{
    channelsCount: number;
    logisticsCount: number;
    totalOrders: number;
    totalTenants: number;
  } | null>(null);

  useEffect(() => {
    publicApi.stats().then((r) => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <PublicLayout>
      {/* ═══ HERO ═══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Soft background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-green-50/50 to-white" />
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-emerald-200/40 blur-[120px] animate-pulse-soft" />
          <div className="absolute top-20 right-1/4 w-96 h-96 rounded-full bg-teal-200/40 blur-[120px] animate-pulse-soft" style={{ animationDelay: '1.5s' }} />
          {/* Cloud-like blobs */}
          <div className="absolute top-32 left-10 w-32 h-12 rounded-full bg-white/70 blur-xl animate-bob" />
          <div className="absolute top-16 right-32 w-40 h-14 rounded-full bg-white/70 blur-xl animate-bob" style={{ animationDelay: '2s' }} />
          <div className="absolute top-40 right-16 w-28 h-10 rounded-full bg-white/80 blur-xl animate-bob" style={{ animationDelay: '3s' }} />
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-emerald-200/50 shadow-sm text-xs font-bold text-emerald-700 uppercase tracking-wider animate-slide-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Now connecting 50+ channels
          </div>

          <h1 className="mt-6 text-5xl md:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1] max-w-4xl mx-auto animate-slide-up">
            Data-Driven Commerce<br />
            <span className="gradient-text">Powered by AI</span>
          </h1>

          <p className="mt-6 max-w-xl mx-auto text-base md:text-lg text-slate-600 leading-relaxed animate-slide-up">
            Effortlessly manage every channel, uncover trends, and make smarter decisions in minutes — not weeks.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-slide-up">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-full shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all group"
            >
              Try for Free
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-full transition-all group">
              <Play size={12} fill="white" className="group-hover:scale-125 transition-transform" /> Schedule a Demo
            </button>
          </div>
        </div>

        {/* Dashboard preview mockup */}
        <div className="relative max-w-6xl mx-auto px-6 pb-20" data-reveal="zoom">
          <div className="relative rounded-3xl bg-white border border-slate-200/70 shadow-2xl shadow-emerald-500/10 overflow-hidden hover-tilt">
            <DashboardMockup />
          </div>
          {/* Floating mini mockup */}
          <div className="hidden lg:block absolute -left-8 top-20 w-64 h-[380px] rounded-2xl bg-white border border-slate-200/70 shadow-xl overflow-hidden animate-float">
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600" />
                <div>
                  <div className="text-[10px] font-bold text-slate-900">Good morning 👋</div>
                  <div className="text-[8px] text-slate-500">Sazirun</div>
                </div>
              </div>
              <div className="space-y-1.5 mt-3">
                {['Dashboard', 'Tracking', 'Analytics', 'Inventory', 'Orders'].map((l, i) => (
                  <div key={l} className={`px-2 py-1.5 rounded text-[9px] font-semibold ${i === 0 ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'}`}>
                    {l}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ LIVE STATS COUNTERS ═════════════════════════════════════ */}
      <section className="py-12 bg-gradient-to-b from-white via-emerald-50/30 to-white border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6" data-stagger>
          {[
            { value: stats?.channelsCount  ?? ALL_CHANNELS.length, suffix: '+', label: 'Channels integrated' },
            { value: stats?.logisticsCount ?? 16,                  suffix: '+', label: 'Logistics partners' },
            {
              value: stats?.totalOrders ?? 0,
              suffix: '+',
              label: 'Orders processed',
              format: (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}K` : String(n)),
            },
            { value: stats?.totalTenants ?? 0, suffix: '+', label: 'Businesses onboarded' },
          ].map((s, i) => (
            <div key={i} className="text-center" data-reveal>
              <div className="text-4xl md:text-5xl font-bold gradient-text">
                <CountUp value={s.value} suffix={s.suffix} format={s.format} />
              </div>
              <div className="text-xs text-slate-500 font-semibold mt-2 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CHANNEL MARQUEE ═══════════════════════════════════════════ */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 text-center mb-10" data-reveal>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">
            <Sparkles size={12} /> Integrations
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
            <CountUp value={ALL_CHANNELS.length} suffix="+" /> channels.<br />
            <span className="gradient-text">Connected out of the box.</span>
          </h2>
          <p className="mt-4 text-slate-600 max-w-xl mx-auto">
            Amazon to Zepto, Shopify to WhatsApp — hover to pause and explore every integration.
          </p>
        </div>

        <div data-reveal>
          <ChannelMarquee />
        </div>

        <div className="max-w-4xl mx-auto px-6 text-center mt-10" data-reveal>
          <Link
            href="/dashboard/channels"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-full shadow-md shadow-emerald-500/20 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            Browse All Integrations <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      {/* ═══ WHY US ═══════════════════════════════════════════════════ */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start mb-12">
            <div className="lg:col-span-3" data-reveal="left">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                Why OmniStock
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
                The Commerce Challenge<br />
                Every Business Faces
              </h2>
            </div>
            <div className="lg:col-span-2 flex lg:items-end lg:justify-end" data-reveal="right">
              <p className="text-sm text-slate-600 leading-relaxed max-w-sm">
                Turning data into insights is a challenge for every business. Our platform simplifies data processes, enabling faster, smarter decisions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5" data-stagger>
            {BUSINESS_CHALLENGES.map(c => {
              const Icon = c.icon;
              return (
                <div
                  key={c.title}
                  data-reveal
                  className={`rounded-2xl p-6 border hover-lift transition-all ${
                    c.accent
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-500/30'
                      : 'bg-white border-slate-200 text-slate-900 shadow-sm hover:shadow-xl'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform hover:rotate-6 ${
                      c.accent ? 'bg-white/15' : 'bg-emerald-50'
                    }`}>
                      <Icon size={18} className={c.accent ? 'text-white' : 'text-emerald-600'} />
                    </div>
                    <ArrowRight size={16} className={c.accent ? 'text-white/70' : 'text-slate-400'} />
                  </div>
                  <h3 className={`font-bold text-lg ${c.accent ? 'text-white' : 'text-slate-900'}`}>
                    {c.title}
                  </h3>
                  <p className={`text-sm mt-2 leading-relaxed ${c.accent ? 'text-white/80' : 'text-slate-600'}`}>
                    {c.description}
                  </p>
                  {/* Animated mini chart */}
                  <div className="mt-6 flex items-end gap-1 h-16">
                    {[30, 45, 35, 60, 40, 75, 55, 85, 65].map((h, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-t origin-bottom transition-transform duration-500 ${
                          c.accent ? 'bg-white/40' : 'bg-gradient-to-t from-emerald-200 to-emerald-400'
                        }`}
                        style={{ height: `${h}%`, transitionDelay: `${i * 50}ms` }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ TOOLS ═══════════════════════════════════════════════════ */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14" data-reveal>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
              All the Tools You Need for<br />
              Powerful <span className="gradient-text">Commerce.</span>
            </h2>
            <p className="mt-5 text-base text-slate-600 max-w-xl mx-auto">
              Get the best value for your money with our tailored pricing options. Whether you need basic features or a fully customized solution, we've got you covered.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5" data-stagger>
            {FEATURE_TOOLS.map((t) => (
              <div
                key={t.title}
                data-reveal
                className={`rounded-2xl p-6 border hover-lift ${
                  t.highlight
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-500/25'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                {/* Animated visual */}
                <div className={`h-36 rounded-xl mb-5 p-4 ${
                  t.highlight ? 'bg-white/10' : 'bg-slate-50'
                } flex items-end justify-around gap-2 group/bars`}>
                  {(t.visual === 'chart' ? [30, 55, 45, 70, 60, 85, 50] :
                    t.visual === 'bar'   ? [60, 80, 45, 90, 70, 50, 85] :
                                          [50, 40, 65, 55, 75, 60, 45]).map((h, j) => (
                    <div
                      key={j}
                      className={`flex-1 rounded-t-md origin-bottom transition-all duration-500 group-hover/bars:scale-y-110 ${
                        t.highlight ? 'bg-white/80' : 'bg-gradient-to-t from-emerald-300 to-emerald-500'
                      }`}
                      style={{ height: `${h}%`, transitionDelay: `${j * 40}ms` }}
                    />
                  ))}
                </div>
                <h3 className={`font-bold text-lg ${t.highlight ? 'text-white' : 'text-slate-900'}`}>
                  {t.title}
                </h3>
                <p className={`text-sm mt-2 leading-relaxed ${t.highlight ? 'text-white/80' : 'text-slate-600'}`}>
                  {t.description}
                </p>
                <Link
                  href="/dashboard"
                  className={`mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all hover:-translate-y-0.5 ${
                    t.highlight
                      ? 'bg-white text-emerald-700 hover:bg-emerald-50'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  Get Started <ArrowRight size={12} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS STRIP ══════════════════════════════════════ */}
      <section className="py-24 bg-gradient-to-b from-white to-emerald-50/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12" data-reveal>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">
              <Star size={12} /> Loved by founders
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
              Brands are switching<br />
              <span className="gradient-text">every day.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5" data-stagger>
            {[
              { quote: "We went from juggling 6 seller panels to one dashboard. Order processing time dropped 70%.", author: 'Priya Mehta', role: 'Founder, Bloom & Bee', avatar: 'PM' },
              { quote: "Finally, an ERP that feels like a modern SaaS — not a 2005 spreadsheet. The team loves it.", author: 'Arjun Kapoor', role: 'Ops Head, Urbanly',  avatar: 'AK' },
              { quote: "Connected to Blinkit, Zepto and Shopify in one afternoon. Sales pipeline visible end-to-end.", author: 'Rhea Shah', role: 'CEO, Kale Kitchen', avatar: 'RS' },
            ].map((t, i) => (
              <div key={i} data-reveal className="bg-white rounded-2xl border border-slate-200 p-6 hover-lift hover:shadow-xl transition-all">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 text-sm leading-relaxed font-medium">"{t.quote}"</p>
                <div className="flex items-center gap-3 mt-5 pt-5 border-t border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">{t.author}</div>
                    <div className="text-xs text-slate-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══════════════════════════════════════════════════ */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2" data-reveal="left">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
              Frequently Asked<br />
              Questions
            </h2>
            <p className="mt-5 text-base text-slate-600 leading-relaxed">
              Can't find what you're looking for? Our team is ready to help — reach out anytime.
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Users size={14} className="text-emerald-600" />
                </div>
                Bangalore, KA, India
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Globe size={14} className="text-emerald-600" />
                </div>
                hello@omnistock.in
              </div>
            </div>
            <Link
              href="/contact"
              className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-full shadow-md transition-all hover:-translate-y-0.5"
            >
              Contact Us <ArrowRight size={13} />
            </Link>
          </div>

          <div className="lg:col-span-3 space-y-2" data-reveal="right">
            {FAQS.map((item, i) => (
              <details key={i} className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-emerald-200 transition-colors">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none">
                  <span className="text-sm font-bold text-slate-900 pr-4">{item.q}</span>
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 group-open:bg-emerald-100 flex items-center justify-center text-lg leading-none text-slate-600 group-open:text-emerald-700 group-open:rotate-45 transition-all">
                    +
                  </span>
                </summary>
                <div className="px-5 pb-4 -mt-1 text-sm text-slate-600 leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ NEWSLETTER ═══════════════════════════════════════════ */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6" data-reveal="zoom">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-10 md:p-14 shadow-2xl shadow-emerald-500/30">
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/4 animate-pulse-soft" />
            <div className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full bg-emerald-300/20 blur-3xl translate-y-1/2 animate-pulse-soft" style={{ animationDelay: '1.5s' }} />

            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
                  Join Our Newsletter
                </h2>
                <p className="mt-3 text-sm text-white/80 leading-relaxed max-w-md">
                  Get the latest commerce insights, product updates, and actionable tips delivered to your inbox. No spam, ever.
                </p>
              </div>
              <form className="flex flex-col sm:flex-row gap-2" onSubmit={e => e.preventDefault()}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 bg-white/10 backdrop-blur border border-white/20 text-white placeholder:text-white/60 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
                />
                <button type="submit" className="inline-flex items-center justify-center gap-1.5 px-5 py-3 bg-white text-emerald-700 text-sm font-bold rounded-full hover:bg-emerald-50 hover:-translate-y-0.5 transition-all group">
                  Subscribe
                  <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

// ─── Dashboard mockup visual for hero ──────────────────────────────────────
function DashboardMockup() {
  return (
    <div className="p-4 md:p-6 bg-slate-50">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-bold text-slate-500">Hi Sazirun 👋</div>
          <div className="text-lg font-bold text-slate-900">Good morning!</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-24 bg-slate-200 rounded-md" />
          <div className="h-6 w-20 bg-emerald-500 rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-4 bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Shipment Analytics</div>
          <div className="text-xl font-bold text-slate-900 mt-1">202,760</div>
          <div className="text-[10px] text-emerald-600 font-bold">+0.86% vs last month</div>
          <div className="mt-2 flex items-end gap-0.5 h-16">
            {[40, 55, 45, 70, 60, 85, 50, 75, 65, 90, 55, 80].map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-sm ${i === 5 ? 'bg-emerald-500' : 'bg-emerald-200'}`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        <div className="col-span-6 md:col-span-4 bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Avg Working Time</div>
          <div className="text-xl font-bold text-slate-900 mt-1">48.64%</div>
          <div className="text-[10px] text-emerald-600 font-bold">+0.86% vs last month</div>
          <div className="mt-2 flex items-end gap-0.5 h-16">
            {[35, 50, 40, 65, 55, 80, 45, 70, 60, 85, 50, 75].map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-sm ${i === 5 ? 'bg-emerald-500' : 'bg-emerald-200'}`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        <div className="col-span-6 md:col-span-4 bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Channels</div>
          <div className="flex items-center justify-center h-20 mt-2">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" stroke="#d1fae5" strokeWidth="4" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="68 100" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-900">
                68%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
