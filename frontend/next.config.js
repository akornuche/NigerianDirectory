/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode
  reactStrictMode: true,
  
  // Images are served as stored, without Vercel Image Optimization.
  // Almost every image already lives in Vercel Blob storage, compressed
  // (hero images are WebP). Optimizing them again, in two formats and at
  // many widths, with Next's default 60-second cache, used up the Hobby
  // plan's monthly image-transformation quota; past the quota, new
  // transformations fail and images can break. Serving them directly uses
  // no transformations.
  images: {
    unoptimized: true,
  },

  // Environment variables (exposed to client)
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    NEXT_PUBLIC_SITE_NAME: 'NigerianDirectory.com',
  },
  
  // Custom headers for SEO
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/schools',
        destination: '/',
        permanent: false,
      },
    ];
  },
  
  // Trailing slash for SEO consistency
  trailingSlash: true,
};

module.exports = nextConfig;
