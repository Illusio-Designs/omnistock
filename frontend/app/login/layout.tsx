import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In — Omnistock',
  description: 'Sign in to your Omnistock dashboard.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Sign In — Omnistock',
    description: 'Sign in to your Omnistock dashboard.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
