'use client';

import { create } from 'zustand';

interface SearchState {
  query: string;
  setQuery: (q: string) => void;
  clear: () => void;
}

// Global search shared between the Topbar input and every page that filters
// its list. Cleared automatically on route change by `<SearchRouteReset>`.
export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  setQuery: (query) => set({ query }),
  clear: () => set({ query: '' }),
}));
