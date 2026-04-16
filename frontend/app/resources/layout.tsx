import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resources — OmniStock',
  description:
    'Blog, case studies, video tutorials, and help center for OmniStock users.',
  openGraph: {
    title: 'Resources — OmniStock',
    description:
      'Blog, case studies, video tutorials, and help center for OmniStock users.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
