import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import '@/styles/globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AdScripts from '@/components/ads/AdScripts';
import { CookieConsent } from '@/components/ads';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';

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
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
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
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || 'your-google-verification-code',
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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="theme-color" content="#1D4ED8" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="icon" href="/nd logo.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/nd logo.jpg" />
        <AdScripts />
      </head>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
        <CookieConsent />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
