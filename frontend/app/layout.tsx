import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/layout/Providers';
import { loadSeo } from '@/lib/seo';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

const FALLBACK: Metadata = {
  title: 'OmniStock — Everything Commerce',
  description: 'One platform for all your channels. Sell everywhere, ship anything, grow faster.',
};

export async function generateMetadata(): Promise<Metadata> {
  const dynamic = await loadSeo('/');
  return { ...FALLBACK, ...dynamic };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
