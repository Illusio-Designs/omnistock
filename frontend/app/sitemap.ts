import type { MetadataRoute } from 'next';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const revalidate = 3600; // Re-build at most once an hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = ['/', '/pricing', '/features', '/about', '/contact', '/help', '/solutions', '/resources'];

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
        })),
        ...posts.map((p) => ({
          url: `${SITE}${p.path}`,
          lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        })),
      ];
    }
  } catch {}

  return [
    ...staticPaths.map((p) => ({ url: `${SITE}${p}`, lastModified: new Date(), priority: p === '/' ? 1.0 : 0.7 })),
    ...dynamic,
  ];
}
