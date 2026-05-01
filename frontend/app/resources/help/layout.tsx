import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help Center — Omnistock',
  description:
    'Guides, FAQs, and documentation for getting the most out of Omnistock.',
  openGraph: {
    title: 'Help Center — Omnistock',
    description:
      'Guides, FAQs, and documentation for getting the most out of Omnistock.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
