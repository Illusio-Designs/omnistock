import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help — OmniStock',
  description: 'Find answers to common questions about OmniStock.',
  openGraph: {
    title: 'Help — OmniStock',
    description: 'Find answers to common questions about OmniStock.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
