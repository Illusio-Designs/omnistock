'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSearchStore } from '@/store/search.store';

// Clears the global search query whenever the route changes so each page
// starts with a fresh, empty search box.
export function SearchRouteReset() {
  const pathname = usePathname();
  const clear = useSearchStore((s) => s.clear);

  useEffect(() => {
    clear();
  }, [pathname, clear]);

  return null;
}
