'use client';

import Script from 'next/script';

/**
 * Google Analytics 4 (GA4)
 *
 * Renders nothing unless NEXT_PUBLIC_GOOGLE_ANALYTICS_ID is set to a real
 * measurement ID. Page views across client-side navigations are captured by
 * GA4 enhanced measurement, which listens for History API changes.
 */

const GA_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
const PLACEHOLDER_ID = 'G-XXXXXXXXXX';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

function isConfigured(id: string | undefined): id is string {
  return typeof id === 'string' && id.length > 0 && id !== PLACEHOLDER_ID;
}

export default function GoogleAnalytics() {
  if (!isConfigured(GA_ID)) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { send_page_view: true });
        `}
      </Script>
    </>
  );
}

type EventParams = Record<string, string | number | boolean>;

/**
 * Send a custom GA4 event. Safe to call before gtag.js has loaded or when
 * analytics is not configured: the call is simply dropped.
 */
export function trackEvent(eventName: string, eventData?: EventParams): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }
  window.gtag('event', eventName, eventData ?? {});
}

/** Manually record a page view. */
export function trackPageView(path: string, title?: string): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }
  window.gtag('config', GA_ID, { page_path: path, page_title: title });
}

/** Record a site search. */
export function trackSearch(query: string, resultCount?: number): void {
  trackEvent('search', { search_term: query, result_count: resultCount ?? 0 });
}

/** Record a school or university detail view. */
export function trackInstitutionView(
  institutionId: string,
  institutionName: string,
  institutionType: 'school' | 'university',
  state?: string
): void {
  trackEvent(`view_${institutionType}`, {
    institution_id: institutionId,
    institution_name: institutionName,
    institution_type: institutionType,
    state: state ?? 'unknown',
  });
}

/** Record a form submission. */
export function trackFormSubmission(formType: string, formId?: string): void {
  trackEvent('form_submission', {
    form_type: formType,
    form_id: formId ?? 'unknown',
  });
}
