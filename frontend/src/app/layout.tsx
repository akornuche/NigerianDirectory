import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import '@/styles/globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AdScripts from '@/components/ads/AdScripts';
import { CookieConsent } from '@/components/ads';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  weight: ['500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'NigerianDirectory.com - Find Schools in Nigeria',
    template: '%s | NigerianDirectory.com',
  },
  description:
    'Discover schools across Nigeria. Find verified information about primary and secondary schools, including reviews, contact details, and admission information.',
  keywords: [
    'schools in Nigeria',
    'Nigerian schools',
    'primary schools',
    'secondary schools',
    'education Nigeria',
    'school directory',
  ],
  authors: [{ name: 'NigerianDirectory' }],
  creator: 'NigerianDirectory',
  publisher: 'NigerianDirectory',
  // TEMPORARILY BLOCK INDEXING - Site under development
  // TODO: Change to index: true, follow: true when ready to launch
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: process.env.NEXT_PUBLIC_SITE_URL,
    siteName: 'NigerianDirectory.com',
    title: 'NigerianDirectory.com - Find Schools in Nigeria',
    description:
      'Discover schools across Nigeria. Find verified information about primary and secondary schools.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'NigerianDirectory.com',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NigerianDirectory.com - Find Schools in Nigeria',
    description:
      'Discover schools across Nigeria. Find verified information about primary and secondary schools.',
    images: ['/og-image.png'],
    creator: '@nigeriandir',
  },
  verification: {
    google: 'your-google-verification-code',
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <head>
        <AdScripts />
      </head>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
        <CookieConsent />
      </body>
    </html>
  );
}
