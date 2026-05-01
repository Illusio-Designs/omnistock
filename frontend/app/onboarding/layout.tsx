import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get Started — Omnistock',
  description:
    'Create your Omnistock account and connect your first channel in minutes.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Get Started — Omnistock',
    description:
      'Create your Omnistock account and connect your first channel in minutes.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
