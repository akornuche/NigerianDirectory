import type { Metadata } from 'next';
import { Radio_Canada } from 'next/font/google';
import '@/styles/globals.css';

// Body face. The display face, Radio Canada Big, is self-hosted from
// /public/fonts (see styles/globals.css): this Next.js release does not list
// it in next/font/google.
const radioCanada = Radio_Canada({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-body',
  display: 'swap',
});

// Search-engine ownership checks. Set the codes from Google Search Console
// and Bing Webmaster Tools as environment variables; nothing is emitted when
// they are unset.
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const bingVerification = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  verification: {
    ...(googleVerification ? { google: googleVerification } : {}),
    ...(bingVerification ? { other: { 'msvalidate.01': bingVerification } } : {}),
  },
};

// Pages are cached at the edge and regenerated in the background at most
// every 5 minutes (incremental static regeneration; see the revalidate
// export in app/(main)/layout.tsx). Previously every request rendered from
// scratch (force-dynamic), so nothing was ever served from cache.

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={radioCanada.variable}>
      <head>
        {/* Google Consent Mode defaults. Must run before any Google tag
            (AdSense, GA), so it is the first script in <head>.
            - EEA, UK and Switzerland: everything is denied until the visitor
              chooses (opt-in, as the law there requires).
            - Elsewhere (including Nigeria): anonymous analytics is on by
              default so visits are counted; advertising storage still waits
              for "Accept all". "Necessary only" turns analytics off.
            A returning visitor's saved choice is re-applied immediately.
            See CookieConsent. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500,region:['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IS','IE','IT','LV','LI','LT','LU','MT','NL','NO','PL','PT','RO','SK','SI','ES','SE','GB','CH']});
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted'});
try{var c=localStorage.getItem('cookie-consent');
if(c==='necessary'){gtag('consent','update',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'});}
if(c==='all'){gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});}}catch(e){}`,
          }}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="theme-color" content="#006A40" />
        <link rel="preload" href="/fonts/radio-canada-big-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
