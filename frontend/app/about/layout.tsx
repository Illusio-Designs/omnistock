import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About — OmniStock',
  description:
    'Built by sellers, for sellers. Learn about our mission to make multi-channel commerce boringly reliable.',
  openGraph: {
    title: 'About — OmniStock',
    description:
      'Built by sellers, for sellers. Learn about our mission to make multi-channel commerce boringly reliable.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
