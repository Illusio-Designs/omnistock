'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollRevealProvider } from '@/components/ScrollRevealProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }));

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ScrollRevealProvider />
        {children}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
