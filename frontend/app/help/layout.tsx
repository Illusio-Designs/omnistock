import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help — Omnistock',
  description: 'Find answers to common questions about Omnistock.',
  openGraph: {
    title: 'Help — Omnistock',
    description: 'Find answers to common questions about Omnistock.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
