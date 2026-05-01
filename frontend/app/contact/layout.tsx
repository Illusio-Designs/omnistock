import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact — Omnistock',
  description:
    'Get in touch with the Omnistock team. Sales inquiries, support, partnerships.',
  openGraph: {
    title: 'Contact — Omnistock',
    description:
      'Get in touch with the Omnistock team. Sales inquiries, support, partnerships.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
