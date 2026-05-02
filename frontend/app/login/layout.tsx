import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In — Kartriq',
  description: 'Sign in to your Kartriq dashboard.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Sign In — Kartriq',
    description: 'Sign in to your Kartriq dashboard.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
