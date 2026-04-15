// Server-side SEO metadata loader.
// Fetches a path's SEO settings from the backend and converts them into a
// Next.js Metadata object. Safe to call from any server component.

import type { Metadata } from 'next';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export async function loadSeo(path: string): Promise<Metadata> {
  try {
    const res = await fetch(`${API}/public/seo?path=${encodeURIComponent(path)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return {};
    const data = await res.json();
    if (!data) return {};
    return {
      title: data.title,
      description: data.description || undefined,
      keywords: data.keywords || undefined,
      alternates: data.canonicalUrl ? { canonical: data.canonicalUrl } : undefined,
      robots: data.robots || undefined,
      openGraph: {
        title: data.ogTitle || data.title,
        description: data.ogDescription || data.description || undefined,
        images: data.ogImage ? [{ url: data.ogImage }] : undefined,
      },
      twitter: data.twitterCard ? { card: data.twitterCard as any } : undefined,
    };
  } catch {
    return {};
  }
}
