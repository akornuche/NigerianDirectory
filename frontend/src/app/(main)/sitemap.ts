import { MetadataRoute } from 'next';
import { neon } from '@neondatabase/serverless';
import { getContent } from '@/lib/content';

// Cache for 24 hours — Googlebot never triggers a cold DB query
export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nigeriandirectory.com.ng';
const SITE_UPDATED = new Date('2026-10-19');

const STATES = [
  'abia', 'adamawa', 'akwa-ibom', 'anambra', 'bauchi', 'bayelsa',
  'benue', 'borno', 'cross-river', 'delta', 'ebonyi', 'edo',
  'ekiti', 'enugu', 'fct', 'gombe', 'imo', 'jigawa',
  'kaduna', 'kano', 'katsina', 'kebbi', 'kogi', 'kwara',
  'lagos', 'nasarawa', 'niger', 'ogun', 'ondo', 'osun',
  'oyo', 'plateau', 'rivers', 'sokoto', 'taraba', 'yobe', 'zamfara',
];

function toSlug(s: string) {
  return s.toLowerCase().replace(/ /g, '-');
}

// generateSitemaps splits the output into child sitemaps
// Next.js serves them at /sitemap/[id].xml and auto-generates
// a sitemapindex at /sitemap.xml
export async function generateSitemaps() {
  return [
    { id: 0 }, // static pages + state listings  (no DB)
    { id: 1 }, // school profiles                (DB)
    { id: 2 }, // university profiles             (DB)
    { id: 3 }, // blog posts                      (content files)
  ];
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  switch (id) {
    case 0:
      return getStaticAndStatePages();
    case 1:
      return getSchoolPages();
    case 2:
      return getUniversityPages();
    case 3:
      return getBlogPages();
    default:
      return [];
  }
}

// ─── 0: Static pages + state listings ────────────────────────────────────────
function getStaticAndStatePages(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,                        lastModified: SITE_UPDATED, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE_URL}/education/schools/`,       lastModified: SITE_UPDATED, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE_URL}/education/universities/`,  lastModified: SITE_UPDATED, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE_URL}/blog/`,                    lastModified: SITE_UPDATED, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE_URL}/about/`,                   lastModified: SITE_UPDATED, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/contact/`,                 lastModified: SITE_UPDATED, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/claim/`,                   lastModified: SITE_UPDATED, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const schoolStatePages: MetadataRoute.Sitemap = STATES.map((s) => ({
    url: `${BASE_URL}/education/schools/${s}/`,
    lastModified: SITE_UPDATED, changeFrequency: 'weekly' as const, priority: 0.8,
  }));

  const uniStatePages: MetadataRoute.Sitemap = STATES.map((s) => ({
    url: `${BASE_URL}/education/universities/${s}/`,
    lastModified: SITE_UPDATED, changeFrequency: 'weekly' as const, priority: 0.8,
  }));

  return [...staticPages, ...schoolStatePages, ...uniStatePages];
}

// ─── 1: School profile pages ──────────────────────────────────────────────────
async function getSchoolPages(): Promise<MetadataRoute.Sitemap> {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`
      SELECT slug, state, area, updated_at
      FROM schools
      WHERE institution_category = 'school'
      ORDER BY state, name
    `;
    return rows.map((r) => ({
      url: `${BASE_URL}/education/schools/${toSlug(r.state as string)}/${toSlug((r.area ?? r.state) as string)}/${r.slug}/`,
      lastModified: r.updated_at ? new Date(r.updated_at as string) : SITE_UPDATED,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }));
  } catch (err) {
    console.error('Sitemap schools error:', err);
    return [];
  }
}

// ─── 2: University profile pages ─────────────────────────────────────────────
async function getUniversityPages(): Promise<MetadataRoute.Sitemap> {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`
      SELECT slug, state, city, updated_at
      FROM schools
      WHERE institution_category = 'university'
      ORDER BY state, name
    `;
    return rows.map((r) => ({
      url: `${BASE_URL}/education/universities/${toSlug(r.state as string)}/${toSlug((r.city ?? r.state) as string)}/${r.slug}/`,
      lastModified: r.updated_at ? new Date(r.updated_at as string) : SITE_UPDATED,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }));
  } catch (err) {
    console.error('Sitemap universities error:', err);
    return [];
  }
}

// ─── 3: Blog post pages ───────────────────────────────────────────────────────
async function getBlogPages(): Promise<MetadataRoute.Sitemap> {
  try {
    const posts = await getContent().getAllPosts();
    return posts.map((p) => ({
      url: `${BASE_URL}/blog/${p.slug}/`,
      lastModified: new Date(p.publishedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));
  } catch {
    return [];
  }
}
