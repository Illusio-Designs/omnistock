'use client';

import Link from 'next/link';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { BookOpen, FileText, Video, HelpCircle, ArrowRight, Sparkles } from 'lucide-react';

const RESOURCES = [
  {
    icon: BookOpen,
    title: 'Blog',
    description: 'Commerce tips, growth playbooks, product updates and industry insights.',
    href: '/resources/blog',
    count: '42 articles',
  },
  {
    icon: FileText,
    title: 'Case Studies',
    description: 'How real brands built their omnichannel empires with OmniStock.',
    href: '/resources/cases',
    count: '12 stories',
  },
  {
    icon: HelpCircle,
    title: 'Help Center',
    description: 'Step-by-step guides, setup tutorials, and troubleshooting.',
    href: '/resources/help',
    count: '200+ articles',
  },
  {
    icon: Video,
    title: 'Videos & Webinars',
    description: 'Watch live product demos, walkthroughs, and recorded sessions.',
    href: '/resources/videos',
    count: '30+ videos',
  },
];

export default function ResourcesPage() {
  return (
    <PublicLayout>
      <section className="relative overflow-hidden pt-20 pb-16">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-white" />
        <div className="absolute top-20 left-1/3 w-96 h-96 rounded-full bg-emerald-200/40 blur-[120px] -z-10" />

        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">
            <Sparkles size={12} /> Resources
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
            Learn. Build. <span className="gradient-text">Scale.</span>
          </h1>
          <p className="mt-5 text-lg text-slate-600 max-w-xl mx-auto">
            Everything you need to master omnichannel commerce — articles, guides, case studies, and videos.
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {RESOURCES.map(r => {
            const Icon = r.icon;
            return (
              <Link
                key={r.title}
                href={r.href}
                className="group relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-7 hover:border-emerald-300 hover:shadow-xl transition-all"
              >
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-emerald-50 blur-3xl opacity-0 group-hover:opacity-100 -translate-y-1/2 translate-x-1/2 transition-opacity" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-5 group-hover:bg-emerald-100 transition-colors">
                    <Icon size={20} className="text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{r.title}</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{r.description}</p>
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-500">{r.count}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                      Browse <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </PublicLayout>
  );
}
