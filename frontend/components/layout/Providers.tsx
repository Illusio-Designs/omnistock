'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollRevealProvider } from '@/components/ScrollRevealProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DemoTriggerProvider } from '@/components/public/DemoTrigger';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }));

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ScrollRevealProvider />
        {/* DemoTriggerProvider lives at the global root so useDemoTrigger()
            works from any page-level component, including pages that ARE
            the parent of PublicLayout (e.g. LandingPage, PricingPage). */}
        <DemoTriggerProvider>
          {children}
        </DemoTriggerProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
