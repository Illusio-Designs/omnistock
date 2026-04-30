import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog — Uniflo',
  description:
    'Commerce insights, product updates, and growth playbooks from the Uniflo team.',
  openGraph: {
    title: 'Blog — Uniflo',
    description:
      'Commerce insights, product updates, and growth playbooks from the Uniflo team.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
