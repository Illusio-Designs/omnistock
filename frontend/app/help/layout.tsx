import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help — Uniflo',
  description: 'Find answers to common questions about Uniflo.',
  openGraph: {
    title: 'Help — Uniflo',
    description: 'Find answers to common questions about Uniflo.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
