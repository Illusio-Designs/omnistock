// Shared hook that filters a list by the global Topbar search query.
// Each page provides a function that produces a single searchable string
// per item; the hook runs an LCS-free, case-insensitive substring match.
//
// Usage:
//   const filtered = useFilteredBySearch(
//     data?.customers,
//     (c) => `${c.name} ${c.email || ''} ${c.phone || ''}`,
//   );
//
// The Topbar already auto-clears the query on route change (see
// SearchRouteReset.tsx) so each page starts with the full list.

import { useSearchStore } from '@/store/search.store';

export function useFilteredBySearch<T>(
  items: T[] | undefined | null,
  toText: (it: T) => string,
): T[] {
  const q = useSearchStore((s) => s.query).trim().toLowerCase();
  if (!items) return [];
  if (!q) return items;
  return items.filter((it) => {
    try { return toText(it).toLowerCase().includes(q); }
    catch { return false; }
  });
}
