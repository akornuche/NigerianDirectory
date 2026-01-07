'use client';

import Script from 'next/script';

const GOOGLE_ADSENSE_ID = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID;
const MEDIANET_CUSTOMER_ID = process.env.NEXT_PUBLIC_MEDIANET_CUSTOMER_ID;
const MEDIANET_WINDOW_ID = process.env.NEXT_PUBLIC_MEDIANET_WINDOW_ID;

export default function AdScripts() {
  // Don't load ad scripts in development
  if (process.env.NODE_ENV === 'development') {
    return null;
  }

  return (
    <>
      {/* Google AdSense */}
      {GOOGLE_ADSENSE_ID && (
        <Script
          id="google-adsense"
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${GOOGLE_ADSENSE_ID}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      )}

      {/* Google Consent Mode (for GDPR compliance) */}
      {GOOGLE_ADSENSE_ID && (
        <Script
          id="google-consent-mode"
          strategy="beforeInteractive"
        >
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              'analytics_storage': 'denied',
              'ad_storage': 'denied',
              'ad_personalization': 'denied',
              'ad_user_data': 'denied',
              'wait_for_update': 500
            });
          `}
        </Script>
      )}

      {/* Media.net */}
      {MEDIANET_CUSTOMER_ID && MEDIANET_WINDOW_ID && (
        <>
          <Script
            id="medianet-init"
            strategy="afterInteractive"
          >
            {`
              window._mNHandle = window._mNHandle || {};
              window._mNHandle.queue = window._mNHandle.queue || [];
              window.mediapolygon = window.mediaPolygon || [];
            `}
          </Script>
          <Script
            id="medianet-main"
            async
            src={`https://contextual.media.net/dmedianet.js?cid=${MEDIANET_CUSTOMER_ID}`}
            strategy="afterInteractive"
          />
        </>
      )}
    </>
  );
}
