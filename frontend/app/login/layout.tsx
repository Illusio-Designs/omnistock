import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In — Uniflo',
  description: 'Sign in to your Uniflo dashboard.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Sign In — Uniflo',
    description: 'Sign in to your Uniflo dashboard.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
