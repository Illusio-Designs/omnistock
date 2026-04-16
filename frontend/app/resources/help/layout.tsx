import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help Center — OmniStock',
  description:
    'Guides, FAQs, and documentation for getting the most out of OmniStock.',
  openGraph: {
    title: 'Help Center — OmniStock',
    description:
      'Guides, FAQs, and documentation for getting the most out of OmniStock.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
