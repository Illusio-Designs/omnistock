import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact — Kartriq',
  description:
    'Get in touch with the Kartriq team. Sales inquiries, support, partnerships.',
  openGraph: {
    title: 'Contact — Kartriq',
    description:
      'Get in touch with the Kartriq team. Sales inquiries, support, partnerships.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
