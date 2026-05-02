import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resources — Kartriq',
  description:
    'Blog, case studies, video tutorials, and help center for Kartriq users.',
  openGraph: {
    title: 'Resources — Kartriq',
    description:
      'Blog, case studies, video tutorials, and help center for Kartriq users.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
