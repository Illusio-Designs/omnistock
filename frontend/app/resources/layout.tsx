import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resources — Omnistock',
  description:
    'Blog, case studies, video tutorials, and help center for Omnistock users.',
  openGraph: {
    title: 'Resources — Omnistock',
    description:
      'Blog, case studies, video tutorials, and help center for Omnistock users.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
