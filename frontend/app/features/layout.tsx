import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Features — OmniStock',
  description:
    'Explore 50+ features including multi-channel sync, real-time inventory, smart reconciliation, returns management, and more.',
  openGraph: {
    title: 'Features — OmniStock',
    description:
      'Explore 50+ features including multi-channel sync, real-time inventory, smart reconciliation, returns management, and more.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
