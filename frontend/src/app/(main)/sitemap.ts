import { MetadataRoute } from 'next';
import { neon } from '@neondatabase/serverless';
import { getContent } from '@/lib/content';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nigeriandirectory.com.ng';
const SITE_UPDATED = new Date('2026-10-19');

// All 36 states + FCT (slug format)
const STATES = [
  'abia', 'adamawa', 'akwa-ibom', 'anambra', 'bauchi', 'bayelsa',
  'benue', 'borno', 'cross-river', 'delta', 'ebonyi', 'edo',
  'ekiti', 'enugu', 'fct', 'gombe', 'imo', 'jigawa',
  'kaduna', 'kano', 'katsina', 'kebbi', 'kogi', 'kwara',
  'lagos', 'nasarawa', 'niger', 'ogun', 'ondo', 'osun',
  'oyo', 'plateau', 'rivers', 'sokoto', 'taraba', 'yobe', 'zamfara',
];

function toSlug(str: string): string {
  return str.toLowerCase().replace(/ /g, '-');
}

// ─── DB fetchers (server-side, no API hop) ────────────────────────────────────

async function getSchoolsFromDB() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`
      SELECT slug, state, area, updated_at
      FROM schools
      WHERE institution_category = 'school'
      ORDER BY state, name
    `;
    return rows.map((r) => ({
      slug: r.slug as string,
      state: toSlug(r.state as string),
      area: toSlug((r.area ?? r.state) as string),
      updated_at: r.updated_at as string,
    }));
  } catch (err) {
    console.error('Sitemap: failed to fetch schools from DB', err);
    return [];
  }
}

async function getUniversitiesFromDB() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`
      SELECT slug, state, city, updated_at
      FROM schools
      WHERE institution_category = 'university'
      ORDER BY state, name
    `;
    return rows.map((r) => ({
      slug: r.slug as string,
      state: toSlug(r.state as string),
      city: toSlug((r.city ?? r.state) as string),
      updated_at: r.updated_at as string,
    }));
  } catch (err) {
    console.error('Sitemap: failed to fetch universities from DB', err);
    return [];
  }
}

async function getBlogPosts() {
  try {
    const posts = await getContent().getAllPosts();
    return posts.map((p) => ({ slug: p.slug, publishedAt: p.publishedAt }));
  } catch {
    return [];
  }
}

// ─── Sitemap ──────────────────────────────────────────────────────────────────

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [schools, universities, blogPosts] = await Promise.all([
    getSchoolsFromDB(),
    getUniversitiesFromDB(),
    getBlogPosts(),
  ]);

  // ── Static pages ──────────────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,                          lastModified: SITE_UPDATED, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE_URL}/education/schools/`,        lastModified: SITE_UPDATED, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE_URL}/education/universities/`,   lastModified: SITE_UPDATED, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE_URL}/blog/`,                     lastModified: SITE_UPDATED, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE_URL}/about/`,                    lastModified: SITE_UPDATED, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/contact/`,                  lastModified: SITE_UPDATED, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/claim/`,                    lastModified: SITE_UPDATED, changeFrequency: 'monthly', priority: 0.5 },
  ];

  // ── State listing pages ───────────────────────────────────────────────────
  const schoolStatePages: MetadataRoute.Sitemap = STATES.map((s) => ({
    url: `${BASE_URL}/education/schools/${s}/`,
    lastModified: SITE_UPDATED, changeFrequency: 'weekly', priority: 0.8,
  }));

  const universityStatePages: MetadataRoute.Sitemap = STATES.map((s) => ({
    url: `${BASE_URL}/education/universities/${s}/`,
    lastModified: SITE_UPDATED, changeFrequency: 'weekly', priority: 0.8,
  }));

  // ── Individual school pages (/education/schools/[state]/[area]/[slug]/) ──
  const schoolPages: MetadataRoute.Sitemap = schools.map((s) => ({
    url: `${BASE_URL}/education/schools/${s.state}/${s.area}/${s.slug}/`,
    lastModified: s.updated_at ? new Date(s.updated_at) : SITE_UPDATED,
    changeFrequency: 'weekly', priority: 0.9,
  }));

  const schoolBlogPages: MetadataRoute.Sitemap = schools.map((s) => ({
    url: `${BASE_URL}/education/schools/${s.state}/${s.area}/${s.slug}/blog/`,
    lastModified: s.updated_at ? new Date(s.updated_at) : SITE_UPDATED,
    changeFrequency: 'weekly', priority: 0.7,
  }));

  // ── Individual university pages (/education/universities/[state]/[city]/[slug]/)
  const universityPages: MetadataRoute.Sitemap = universities.map((u) => ({
    url: `${BASE_URL}/education/universities/${u.state}/${u.city}/${u.slug}/`,
    lastModified: u.updated_at ? new Date(u.updated_at) : SITE_UPDATED,
    changeFrequency: 'weekly', priority: 0.9,
  }));

  // ── Blog posts ────────────────────────────────────────────────────────────
  const blogPostPages: MetadataRoute.Sitemap = blogPosts.map((p) => ({
    url: `${BASE_URL}/blog/${p.slug}/`,
    lastModified: new Date(p.publishedAt),
    changeFrequency: 'monthly', priority: 0.7,
  }));

  return [
    ...staticPages,           //    7
    ...schoolStatePages,      //   37
    ...universityStatePages,  //   37
    ...schoolPages,           //  408
    ...schoolBlogPages,       //  408
    ...universityPages,       //  304
    ...blogPostPages,         //    n
  ];
  // Total: 1,201+ URLs
}
