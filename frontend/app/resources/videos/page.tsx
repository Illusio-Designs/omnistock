'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicLayout, usePublicLoading } from '@/components/layout/PublicLayout';
import { publicApi } from '@/lib/api';
import { Sparkles, Play, Clock } from 'lucide-react';
import { VideoCardSkeleton } from '@/components/Shimmer';

interface Video {
  id: string;
  title: string;
  subtitle: string | null;
  data: { duration?: string; url?: string; level?: string; [k: string]: any };
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  usePublicLoading('videos', loading);

  useEffect(() => {
    publicApi.content('VIDEO')
      .then((r) => setVideos(r.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PublicLayout>
      <section className="relative overflow-hidden pt-20 pb-12">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-white" />
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">
            <Play size={12} /> Videos
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-[#06D4B8] to-[#06B6D4] bg-clip-text text-transparent leading-tight">
            Product <span className="gradient-text">walkthroughs.</span>
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            Watch setup guides, feature deep dives, and use-case walkthroughs.
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <VideoCardSkeleton key={i} />
              ))}
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-24">
              <div className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-slate-100 mb-4">
                <Play size={22} className="text-slate-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">No videos yet</h2>
              <p className="text-slate-500 mt-2">Platform admin can add videos at /admin/content.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((v) => {
                const url = v.data?.url || '#';
                return (
                  <Link
                    key={v.id}
                    href={url}
                    target={url.startsWith('http') ? '_blank' : undefined}
                    className="group bg-white rounded-3xl border border-slate-200 overflow-hidden hover:border-emerald-300 hover:shadow-xl transition-all"
                  >
                    <div className="relative h-44 bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                      <div className="absolute inset-0 bg-black/20" />
                      <div className="relative w-14 h-14 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                        <Play size={18} className="text-emerald-600 fill-emerald-600 ml-0.5" />
                      </div>
                      {v.data?.level && (
                        <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-1 rounded-full bg-white/25 backdrop-blur text-white uppercase tracking-wider">
                          {v.data.level}
                        </span>
                      )}
                      {v.data?.duration && (
                        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-black/40 backdrop-blur text-white">
                          <Clock size={10} /> {v.data.duration}
                        </span>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="font-bold text-lg text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2">{v.title}</h3>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed line-clamp-2">{v.subtitle}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
