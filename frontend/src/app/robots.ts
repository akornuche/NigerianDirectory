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
          '/blog/',
        ],
        disallow: [
          '/api/',
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
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/education/',
          '/education/schools/',
          '/blog/',
        ],
        disallow: [
          '/api/',
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
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
