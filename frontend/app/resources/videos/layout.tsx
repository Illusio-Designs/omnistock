import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Video Tutorials — Uniflo',
  description:
    'Watch setup walkthroughs, feature deep dives, and best practices for Uniflo.',
  openGraph: {
    title: 'Video Tutorials — Uniflo',
    description:
      'Watch setup walkthroughs, feature deep dives, and best practices for Uniflo.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
