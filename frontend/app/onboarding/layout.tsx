import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get Started — OmniStock',
  description:
    'Create your OmniStock account and connect your first channel in minutes.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Get Started — OmniStock',
    description:
      'Create your OmniStock account and connect your first channel in minutes.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
