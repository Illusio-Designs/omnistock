import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Video Tutorials — Omnistock',
  description:
    'Watch setup walkthroughs, feature deep dives, and best practices for Omnistock.',
  openGraph: {
    title: 'Video Tutorials — Omnistock',
    description:
      'Watch setup walkthroughs, feature deep dives, and best practices for Omnistock.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
