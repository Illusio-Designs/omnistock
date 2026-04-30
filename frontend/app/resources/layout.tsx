import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resources — Uniflo',
  description:
    'Blog, case studies, video tutorials, and help center for Uniflo users.',
  openGraph: {
    title: 'Resources — Uniflo',
    description:
      'Blog, case studies, video tutorials, and help center for Uniflo users.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
