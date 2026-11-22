import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AdScripts from '@/components/ads/AdScripts';
import { CookieConsent } from '@/components/ads';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';

// Regenerate cached pages at most every 5 minutes. Directory data comes
// from the API, whose responses also revalidate every 5 minutes.
export const revalidate = 300;

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
  // Indexing is the default, so the layout does not assert "index, follow":
  // doing so emitted a second robots tag next to the noindex that 404s and
  // thin pages set, sending crawlers contradictory instructions. Only the
  // preview directives are set here; they combine safely with noindex.
  robots: {
    'max-video-preview': -1,
    'max-image-preview': 'large',
    'max-snippet': -1,
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
  // No global canonical — each page sets its own via generateMetadata
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdScripts />
      <Header />
      <main className="flex-grow">{children}</main>
      <Footer />
      {/* When Google's certified consent message (AdSense > Privacy &
          messaging) is switched on, it asks EEA/UK visitors for consent and
          updates Consent Mode itself, so our own banner is not shown. */}
      {process.env.NEXT_PUBLIC_USE_GOOGLE_CMP !== 'true' && <CookieConsent />}
      <GoogleAnalytics />
    </>
  );
}
