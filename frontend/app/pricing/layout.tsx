import type { Metadata } from 'next';
import { loadSeo } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  return loadSeo('/pricing');
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
