import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nigeriandirectory.com.ng';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ── Default: all bots ──────────────────────────────────────────────
      {
        userAgent: '*',
        allow: [
          '/',
          '/education/',
          '/education/schools/',
          '/education/universities/',
          '/blog/',
          '/sitemap.xml',
        ],
        disallow: [
          '/admin/',
          '/dashboard/',
          '/auth/',
          '/account/',
          '/_next/',
          '/coming-soon/',
          // Non-live verticals
          '/health/',
          '/food/',
          '/home-services/',
          '/real-estate/',
          '/automotive/',
          '/travel/',
          '/business/',
        ],
      },
      // ── Googlebot ─────────────────────────────────────────────────────
      {
        userAgent: 'Googlebot',
        allow: ['/', '/education/', '/blog/', '/sitemap.xml'],
        disallow: [
          '/admin/', '/dashboard/', '/coming-soon/',
          '/health/', '/food/', '/home-services/',
          '/real-estate/', '/automotive/', '/travel/', '/business/',
        ],
      },
      // ── AI / generative bots ──────────────────────────────────────────
      {
        userAgent: 'ChatGPT-User',
        allow: ['/', '/education/', '/blog/'],
        crawlDelay: 1,
      },
      {
        userAgent: 'Claude-Web',
        allow: ['/', '/education/', '/blog/'],
        crawlDelay: 1,
      },
      {
        userAgent: 'Google-Extended',
        allow: ['/', '/education/', '/blog/'],
        crawlDelay: 1,
      },
      {
        userAgent: 'PerplexityBot',
        allow: ['/', '/education/', '/blog/'],
        crawlDelay: 2,
      },
      // ── Rate-limit aggressive SEO crawlers ────────────────────────────
      {
        userAgent: 'AhrefsBot',
        allow: ['/'],
        crawlDelay: 10,
      },
      {
        userAgent: 'SemrushBot',
        allow: ['/'],
        crawlDelay: 10,
      },
      {
        userAgent: 'DotBot',
        disallow: ['/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
