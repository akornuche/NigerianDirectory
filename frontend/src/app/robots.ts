import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nigeriandirectory.com.ng';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/education/', '/blog/'],
        disallow: [
          '/admin/',
          '/dashboard/',
          '/auth/',
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
      {
        userAgent: 'AhrefsBot',
        disallow: ['/'],
      },
      {
        userAgent: 'SemrushBot',
        disallow: ['/'],
      },
      {
        userAgent: 'DotBot',
        disallow: ['/'],
      },
    ],
    sitemap: [`${BASE_URL}/sitemap.xml`, `${BASE_URL}/ai-sitemap.xml`],
  };
}
