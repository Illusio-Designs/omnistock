import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In — OmniStock',
  description: 'Sign in to your OmniStock dashboard.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Sign In — OmniStock',
    description: 'Sign in to your OmniStock dashboard.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
