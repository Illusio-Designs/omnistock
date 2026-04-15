'use client';

import { PublicLayout } from '@/components/layout/PublicLayout';
import { Sparkles, Play, Clock } from 'lucide-react';

const VIDEOS = [
  { title: 'Product walkthrough (2026)',       duration: '12:34', gradient: 'from-emerald-400 to-teal-600' },
  { title: 'Connecting Amazon in 5 minutes',    duration: '5:42',  gradient: 'from-emerald-500 to-green-600' },
  { title: 'Setting up Shiprocket',             duration: '8:15',  gradient: 'from-teal-400 to-emerald-600' },
  { title: 'Bulk product import guide',         duration: '10:28', gradient: 'from-green-400 to-teal-600' },
  { title: 'AI insights deep dive',             duration: '15:03', gradient: 'from-emerald-500 to-emerald-700' },
  { title: 'Returns & refunds workflow',        duration: '7:51',  gradient: 'from-emerald-400 to-teal-500' },
  { title: 'Multi-warehouse setup',             duration: '9:24',  gradient: 'from-teal-500 to-emerald-600' },
  { title: 'Webhook ingestion for devs',        duration: '11:47', gradient: 'from-emerald-500 to-green-500' },
];

export default function VideosPage() {
  return (
    <PublicLayout>
      <section className="relative overflow-hidden pt-20 pb-12">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-white" />

        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">
            <Sparkles size={12} /> Videos & Webinars
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
            Watch. Learn. <span className="gradient-text">Ship.</span>
          </h1>
          <p className="mt-5 text-lg text-slate-600">Product demos, tutorials, and recorded webinars.</p>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {VIDEOS.map(v => (
            <div key={v.title} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-emerald-300 transition-all cursor-pointer group">
              <div className={`relative aspect-video bg-gradient-to-br ${v.gradient} flex items-center justify-center overflow-hidden`}>
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                <div className="relative w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                  <Play size={24} className="text-emerald-700 ml-1" fill="currentColor" />
                </div>
                <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-black/60 backdrop-blur text-white text-[10px] font-bold rounded flex items-center gap-1">
                  <Clock size={10} /> {v.duration}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-slate-900 text-sm">{v.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
