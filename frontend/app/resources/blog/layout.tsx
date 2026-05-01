import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog — Omnistock',
  description:
    'Commerce insights, product updates, and growth playbooks from the Omnistock team.',
  openGraph: {
    title: 'Blog — Omnistock',
    description:
      'Commerce insights, product updates, and growth playbooks from the Omnistock team.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
