import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help Center — Uniflo',
  description:
    'Guides, FAQs, and documentation for getting the most out of Uniflo.',
  openGraph: {
    title: 'Help Center — Uniflo',
    description:
      'Guides, FAQs, and documentation for getting the most out of Uniflo.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
