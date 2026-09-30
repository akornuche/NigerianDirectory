'use client';

import Script from 'next/script';
import { useEffect } from 'react';

/**
 * Google Analytics 4 Component
 * Initializes GA4 for page views and custom event tracking
 * 
 * Usage: Add <GoogleAnalytics /> to your root layout
 * Required: NEXT_PUBLIC_GOOGLE_ANALYTICS_ID env var
 */

declare global {
  interface Window {
    gtag: Function;
    dataLayer: any[];
  }
}

export default function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

  if (!gaId || gaId === 'G-XXXXXXXXXX') {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Google Analytics ID not configured. Set NEXT_PUBLIC_GOOGLE_ANALYTICS_ID env var.');
    }
    return null;
  }

  useEffect(() => {
    // Track page views when route changes
    if (typeof window !== 'undefined' && 'gtag' in window) {
      const gtag = window.gtag;
      gtag('config', gaId, {
        page_path: window.location.pathname,
      });
    }
  }, [gaId]);

  return (
    <>
      {/* Load Google Analytics script */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
        async
      />
      {/* Initialize Google Analytics */}
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{\n          __html: `\n            window.dataLayer = window.dataLayer || [];\n            function gtag(){dataLayer.push(arguments);}\n            gtag('js', new Date());\n            gtag('config', '${gaId}', {\n              send_page_view: true,\n              cookie_flags: 'SameSite=None;Secure'\n            });\n          `,\n        }}\n      />\n    </>\n  );\n}\n\n/**\n * Custom event tracking helper\n * Usage: trackEvent('view_school', { school_id: '123', school_name: 'Example School' })\n */\nexport function trackEvent(\n  eventName: string,\n  eventData?: Record<string, string | number | boolean>\n) {\n  if (typeof window !== 'undefined' && 'gtag' in window) {\n    window.gtag('event', eventName, eventData);\n  }\n}\n\n/**\n * Track page view (automatically done, but available manually if needed)\n */\nexport function trackPageView(path: string, title?: string) {\n  if (typeof window !== 'undefined' && 'gtag' in window) {\n    window.gtag('config', process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID, {\n      page_path: path,\n      page_title: title,\n    });\n  }\n}\n\n/**\n * Track search events\n */\nexport function trackSearch(query: string, resultCount?: number) {\n  trackEvent('search', {\n    search_term: query,\n    result_count: resultCount || 0,\n  });\n}\n\n/**\n * Track school/university views\n */\nexport function trackSchoolView(\n  institutionId: string,\n  institutionName: string,\n  institutionType: 'school' | 'university',\n  state?: string\n) {\n  trackEvent(`view_${institutionType}`, {\n    institution_id: institutionId,\n    institution_name: institutionName,\n    institution_type: institutionType,\n    state: state || 'unknown',\n  });\n}\n\n/**\n * Track form submissions\n */\nexport function trackFormSubmission(formType: string, formId?: string) {\n  trackEvent('form_submission', {\n    form_type: formType,\n    form_id: formId || 'unknown',\n  });\n}\n"