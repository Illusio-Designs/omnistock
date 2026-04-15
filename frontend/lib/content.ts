// Server-side content loader for marketing pages.
// Fetches PublicContent rows by type from the backend and returns them as-is.
// Safe to call from any server component — uses ISR (5 min cache).

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export interface ContentItem {
  id: string;
  type: string;
  slug: string | null;
  title: string;
  subtitle: string | null;
  body: string | null;
  image: string | null;
  icon: string | null;
  category: string | null;
  href: string | null;
  sortOrder: number;
  data: Record<string, any>;
  isActive: boolean;
}

export async function loadContent(type: string): Promise<ContentItem[]> {
  try {
    const res = await fetch(`${API}/public/content?type=${encodeURIComponent(type)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return (await res.json()) as ContentItem[];
  } catch {
    return [];
  }
}

// Helper: group by category. Useful for /features where items are categorized.
export function groupBy<T extends { category: string | null }>(items: T[], key = 'category'): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const k = (item as any)[key] || 'default';
    (out[k] ||= []).push(item);
  }
  return out;
}
