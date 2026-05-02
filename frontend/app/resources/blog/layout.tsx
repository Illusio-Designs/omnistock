import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog — Kartriq',
  description:
    'Commerce insights, product updates, and growth playbooks from the Kartriq team.',
  openGraph: {
    title: 'Blog — Kartriq',
    description:
      'Commerce insights, product updates, and growth playbooks from the Kartriq team.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
