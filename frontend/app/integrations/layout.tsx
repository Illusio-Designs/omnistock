import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Integrations — Uniflo',
  description:
    'Connect to 56+ live marketplaces and 113 more on the roadmap — Amazon, Flipkart, Lazada, Shopee, Mercado Libre, Walmart, Shopify, WooCommerce, Shiprocket, Delhivery and 50+ more from one dashboard.',
  openGraph: {
    title: 'Integrations — Uniflo',
    description:
      'Sell across India, Southeast Asia, North America, Europe, Latin America and the Middle East — one platform, every channel.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
