import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Video Tutorials — Kartriq',
  description:
    'Watch setup walkthroughs, feature deep dives, and best practices for Kartriq.',
  openGraph: {
    title: 'Video Tutorials — Kartriq',
    description:
      'Watch setup walkthroughs, feature deep dives, and best practices for Kartriq.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
