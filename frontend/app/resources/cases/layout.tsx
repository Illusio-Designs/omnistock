import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Case Studies — OmniStock',
  description:
    'How real brands grew GMV with OmniStock. Read success stories from D2C, fashion, and grocery.',
  openGraph: {
    title: 'Case Studies — OmniStock',
    description:
      'How real brands grew GMV with OmniStock. Read success stories from D2C, fashion, and grocery.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
