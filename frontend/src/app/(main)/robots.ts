import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nigeriandirectory.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/education/',
          '/education/schools/',
          '/schools/',
          '/blog/',
          '/api/schools/', // Allow AI agents to access school data
          '/sitemap.xml',
          '/sitemap-schools.xml',
        ],
        disallow: [
          '/admin/',
          '/dashboard/',
          '/_next/',
          '/private/',
          '/coming-soon/',
          // Block all non-live verticals
          '/health/',
          '/food/',
          '/home-services/',
          '/real-estate/',
          '/automotive/',
          '/travel/',
          '/business/',
        ],
      },
      // Specific rules for AI agents and generative engines
      {
        userAgent: 'ChatGPT-User',
        allow: [
          '/',
          '/education/',
          '/education/schools/',
          '/schools/',
          '/api/schools/',
          '/sitemap.xml',
        ],
        crawlDelay: 1,
      },
      {
        userAgent: 'Claude-Web',
        allow: [
          '/',
          '/education/',
          '/education/schools/',
          '/schools/',
          '/api/schools/',
          '/sitemap.xml',
        ],
        crawlDelay: 1,
      },
      {
        userAgent: 'Google-Extended',
        allow: [
          '/',
          '/education/',
          '/education/schools/',
          '/schools/',
          '/api/schools/',
          '/sitemap.xml',
        ],
        crawlDelay: 1,
      },
      {
        userAgent: 'Bingbot',
        allow: [
          '/',
          '/education/',
          '/education/schools/',
          '/schools/',
          '/api/schools/',
          '/sitemap.xml',
        ],
        crawlDelay: 1,
      },
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/education/',
          '/education/schools/',
          '/schools/',
          '/blog/',
          '/api/schools/',
          '/sitemap.xml',
        ],
        disallow: [
          '/admin/',
          '/dashboard/',
          '/coming-soon/',
          '/health/',
          '/food/',
          '/home-services/',
          '/real-estate/',
          '/automotive/',
          '/travel/',
          '/business/',
        ],
        crawlDelay: 1,
      },
      // AI Research and Training Bots
      {
        userAgent: 'PerplexityBot',
        allow: [
          '/',
          '/education/',
          '/schools/',
          '/api/schools/',
        ],
        crawlDelay: 2,
      },
      {
        userAgent: 'You.com-Bot',
        allow: [
          '/',
          '/education/',
          '/schools/',
          '/api/schools/',
        ],
        crawlDelay: 2,
      },
      // Academic and Research Bots
      {
        userAgent: 'ia_archiver', // Internet Archive
        allow: [
          '/',
          '/education/',
          '/schools/',
        ],
        crawlDelay: 5,
      },
    ],
    sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/ai-sitemap.xml`],
    host: baseUrl,
  };
}
