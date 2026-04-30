import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact — Uniflo',
  description:
    'Get in touch with the Uniflo team. Sales inquiries, support, partnerships.',
  openGraph: {
    title: 'Contact — Uniflo',
    description:
      'Get in touch with the Uniflo team. Sales inquiries, support, partnerships.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
