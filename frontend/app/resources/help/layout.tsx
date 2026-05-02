import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help Center — Kartriq',
  description:
    'Guides, FAQs, and documentation for getting the most out of Kartriq.',
  openGraph: {
    title: 'Help Center — Kartriq',
    description:
      'Guides, FAQs, and documentation for getting the most out of Kartriq.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
