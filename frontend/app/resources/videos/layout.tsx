import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Video Tutorials — OmniStock',
  description:
    'Watch setup walkthroughs, feature deep dives, and best practices for OmniStock.',
  openGraph: {
    title: 'Video Tutorials — OmniStock',
    description:
      'Watch setup walkthroughs, feature deep dives, and best practices for OmniStock.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
