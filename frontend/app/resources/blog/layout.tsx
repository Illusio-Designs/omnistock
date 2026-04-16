import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog — OmniStock',
  description:
    'Commerce insights, product updates, and growth playbooks from the OmniStock team.',
  openGraph: {
    title: 'Blog — OmniStock',
    description:
      'Commerce insights, product updates, and growth playbooks from the OmniStock team.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
