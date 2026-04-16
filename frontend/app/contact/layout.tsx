import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact — OmniStock',
  description:
    'Get in touch with the OmniStock team. Sales inquiries, support, partnerships.',
  openGraph: {
    title: 'Contact — OmniStock',
    description:
      'Get in touch with the OmniStock team. Sales inquiries, support, partnerships.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
