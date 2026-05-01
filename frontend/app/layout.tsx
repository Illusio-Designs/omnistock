import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/layout/Providers';
import { PageLoader } from '@/components/PageLoader';
import { Analytics } from '@/components/Analytics';
import { loadSeo } from '@/lib/seo';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://omnistock.vercel.app';

// ── Viewport (separate export in Next 14+) ──
export const viewport: Viewport = {
  themeColor: '#06D4B8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

// ── Global metadata ──
const FALLBACK: Metadata = {
  title: {
    default: 'Omnistock — Multi-channel Inventory & Order Management',
    template: '%s | Omnistock',
  },
  description: 'One platform for all your channels. Manage inventory, orders, returns and reconciliation across Amazon, Flipkart, Shopify and 50+ channels.',
  keywords: [
    'inventory management', 'order management', 'multi-channel', 'ecommerce',
    'OMS', 'WMS', 'Amazon', 'Flipkart', 'Shopify', 'returns management',
    'reconciliation', 'D2C', 'warehouse management', 'SaaS ERP',
  ],
  authors: [{ name: 'Omnistock', url: SITE_URL }],
  creator: 'Omnistock',
  publisher: 'Omnistock',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: 'Omnistock',
    title: 'Omnistock — Multi-channel Inventory & Order Management',
    description: 'Manage inventory, orders, returns and reconciliation across 50+ channels from one platform.',
    images: [
      {
        url: `${SITE_URL}/og-image.svg`,
        width: 1200,
        height: 630,
        alt: 'Omnistock — Everything Commerce',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Omnistock — Multi-channel Commerce Platform',
    description: 'Manage inventory, orders, returns and reconciliation across 50+ channels.',
    images: [`${SITE_URL}/og-image.svg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  verification: {
    // Add your verification codes here when ready
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
  category: 'technology',
};

export async function generateMetadata(): Promise<Metadata> {
  const dynamic = await loadSeo('/');
  return { ...FALLBACK, ...dynamic };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <head>
        {/* Structured data — Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Omnistock',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              url: SITE_URL,
              description: 'Multi-channel inventory and order management platform for D2C brands, marketplaces and warehouses.',
              offers: {
                '@type': 'AggregateOffer',
                lowPrice: '2499',
                highPrice: '19999',
                priceCurrency: 'INR',
                offerCount: '3',
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '150',
              },
            }),
          }}
        />
      </head>
      <body className="font-sans">
        <Analytics />
        <Providers>
          <PageLoader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
