import type { MetadataRoute } from 'next';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://kartriq.vercel.app';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`,          lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE}/features`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE}/pricing`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE}/solutions`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/about`,     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/contact`,   lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.6 },
    { url: `${SITE}/resources`, lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${SITE}/resources/blog`,   lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${SITE}/resources/cases`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/resources/help`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/resources/videos`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/privacy`,   lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${SITE}/terms`,     lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
  ];

  // Dynamic pages from backend (blog posts, SEO paths)
  let dynamic: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API}/public/sitemap`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      const paths: any[] = data.paths || [];
      const posts: any[] = data.posts || [];
      dynamic = [
        ...paths.map((p) => ({
          url: `${SITE}${p.path}`,
          lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
          changeFrequency: 'monthly' as const,
          priority: 0.5,
        })),
        ...posts.map((p) => ({
          url: `${SITE}${p.path}`,
          lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        })),
      ];
    }
  } catch {}

  return [...staticPages, ...dynamic];
}
