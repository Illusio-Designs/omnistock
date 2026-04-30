import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Solutions — Uniflo',
  description:
    'Commerce solutions for D2C brands, marketplaces, quick commerce, 3PL warehouses, beauty and fashion.',
  openGraph: {
    title: 'Solutions — Uniflo',
    description:
      'Commerce solutions for D2C brands, marketplaces, quick commerce, 3PL warehouses, beauty and fashion.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
