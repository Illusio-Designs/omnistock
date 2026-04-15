'use client';

import Link from 'next/link';
import { PublicLayout } from '@/components/layout/PublicLayout';
import {
  Sparkles, ArrowRight, Target, Heart, Rocket, Users, Globe, TrendingUp,
} from 'lucide-react';

const VALUES = [
  {
    icon: Heart,
    title: 'Customer-obsessed',
    description: 'Every feature ships because a real brand asked for it. We build with our users, not for them.',
  },
  {
    icon: Rocket,
    title: 'Ship fast, iterate',
    description: 'We release weekly. Small, frequent updates beat giant quarterly releases — every time.',
  },
  {
    icon: Globe,
    title: 'Open & transparent',
    description: 'Public changelog, public roadmap. You always know what we’re working on and why.',
  },
];

const STATS = [
  { value: '2023', label: 'Founded' },
  { value: '50+',  label: 'Channels integrated' },
  { value: '500K',  label: 'Orders processed' },
  { value: '3',    label: 'Countries (growing)' },
];

const TEAM = [
  { name: 'Rohan Mehra',  role: 'Co-founder & CEO',  avatar: 'RM', gradient: 'from-emerald-400 to-teal-600' },
  { name: 'Aditi Nair',   role: 'Co-founder & CTO',  avatar: 'AN', gradient: 'from-emerald-500 to-green-600' },
  { name: 'Karan Shah',   role: 'Head of Product',   avatar: 'KS', gradient: 'from-teal-400 to-emerald-600' },
  { name: 'Priya Rao',    role: 'Head of Growth',    avatar: 'PR', gradient: 'from-emerald-400 to-teal-500' },
];

const JOBS = [
  { title: 'Senior Backend Engineer', location: 'Bangalore / Remote', type: 'Full-time' },
  { title: 'Product Designer',         location: 'Bangalore / Remote', type: 'Full-time' },
  { title: 'Customer Success Manager', location: 'Mumbai',             type: 'Full-time' },
  { title: 'Growth Marketer',          location: 'Remote',             type: 'Full-time' },
];

export default function AboutPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-16">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-white" />
        <div className="absolute top-20 left-1/3 w-96 h-96 rounded-full bg-emerald-200/40 blur-[120px] -z-10" />

        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">
            <Sparkles size={12} /> About us
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
            We're building the future of <span className="gradient-text">omnichannel commerce.</span>
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            OmniStock started because running a multi-channel brand in India shouldn't require 7 dashboards and a spreadsheet. We believe in beautiful tools that get out of your way and let you focus on what matters — building great products and delighting customers.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-10 md:p-14 text-white shadow-2xl shadow-emerald-500/25">
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/4" />
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-bold uppercase tracking-widest mb-4">
                  <Target size={12} /> Our Mission
                </div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                  Make commerce accessible to every builder.
                </h2>
              </div>
              <p className="text-base md:text-lg text-white/85 leading-relaxed">
                We're on a mission to democratize multi-channel selling — giving indie brands, D2C startups, and enterprise sellers the same powerful tools at a fraction of the cost. Sell on Amazon, Zepto, and your own Shopify store from day one. No enterprise contracts. No months-long onboarding.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-6 text-center hover:border-emerald-300 hover:shadow-lg transition-all">
                <div className="text-4xl font-bold gradient-text">{s.value}</div>
                <div className="text-xs text-slate-500 font-semibold mt-2 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
              What we <span className="gradient-text">believe in.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {VALUES.map(v => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-emerald-200 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                    <Icon size={20} className="text-emerald-600" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900">{v.title}</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{v.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">
              <Users size={12} /> Team
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
              The humans behind it.
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {TEAM.map(t => (
              <div key={t.name} className="bg-white rounded-2xl p-5 text-center border border-slate-200">
                <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white text-lg font-bold shadow-lg`}>
                  {t.avatar}
                </div>
                <div className="font-bold text-slate-900 text-sm mt-3">{t.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Careers */}
      <section id="careers" className="py-20 scroll-mt-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">
              <Rocket size={12} /> Careers
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
              Come build with us.
            </h2>
            <p className="mt-4 text-slate-600">
              We're hiring across engineering, product, design and growth. Remote-first culture. Great equity.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {JOBS.map(job => (
              <div key={job.title} className="flex items-center justify-between p-5 hover:bg-emerald-50/30 transition-colors">
                <div>
                  <div className="font-bold text-slate-900">{job.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{job.location} · {job.type}</div>
                </div>
                <Link href="/contact" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700">
                  Apply <ArrowRight size={12} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
