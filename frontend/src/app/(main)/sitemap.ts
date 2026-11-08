import { MetadataRoute } from 'next';
import { neon } from '@neondatabase/serverless';
import { getContent } from '@/lib/content';
import { assessContentQuality } from '@/lib/content-quality';

// ISR: generate once, cache for 24 hours
// Googlebot never triggers a cold DB query
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [schools, universities, blogPosts] = await Promise.all([
    getSchools(),
    getUniversities(),
    getBlogPosts(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,                       lastModified: SITE_UPDATED, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE_URL}/education/schools/`,      lastModified: SITE_UPDATED, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE_URL}/education/universities/`, lastModified: SITE_UPDATED, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE_URL}/blog/`,                   lastModified: SITE_UPDATED, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE_URL}/about/`,                  lastModified: SITE_UPDATED, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/contact/`,                lastModified: SITE_UPDATED, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/claim/`,                  lastModified: SITE_UPDATED, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const schoolStatePages = STATES.map((s) => ({
    url: `${BASE_URL}/education/schools/${s}/`,
    lastModified: SITE_UPDATED, changeFrequency: 'weekly' as const, priority: 0.8,
  }));

  const uniStatePages = STATES.map((s) => ({
    url: `${BASE_URL}/education/universities/${s}/`,
    lastModified: SITE_UPDATED, changeFrequency: 'weekly' as const, priority: 0.8,
  }));

  const schoolPages = schools.map((s) => ({
    url: `${BASE_URL}/education/schools/${s.state}/${s.area}/${s.slug}/`,
    lastModified: s.updated_at ? new Date(s.updated_at) : SITE_UPDATED,
    changeFrequency: 'weekly' as const, priority: 0.9,
  }));

  const universityPages = universities.map((u) => ({
    url: `${BASE_URL}/education/universities/${u.state}/${u.city}/${u.slug}/`,
    lastModified: u.updated_at ? new Date(u.updated_at) : SITE_UPDATED,
    changeFrequency: 'weekly' as const, priority: 0.9,
  }));

  const blogPostPages = blogPosts.map((p) => ({
    url: `${BASE_URL}/blog/${p.slug}/`,
    lastModified: new Date(p.publishedAt),
    changeFrequency: 'monthly' as const, priority: 0.7,
  }));

  return [
    ...staticPages,       //   7
    ...schoolStatePages,  //  37
    ...uniStatePages,     //  37
    ...schoolPages,       // 408
    ...universityPages,   // 304
    ...blogPostPages,     //   n
    // Total: ~795+ URLs (school /blog/ pages excluded — no real content yet)
  ];
}

async function getSchools() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`
      SELECT slug, state, area, updated_at,
             enriched_history, enriched_academics,
             enriched_campus_info, enriched_student_life
      FROM schools
      WHERE institution_category = 'school' ORDER BY state, name
    `;
    return rows.filter((r) => assessContentQuality(r).indexable).map((r) => ({
      slug: r.slug as string,
      state: toSlug(r.state as string),
      area: toSlug((r.area ?? r.state) as string),
      updated_at: r.updated_at as string,
    }));
  } catch { return []; }
}

async function getUniversities() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`
      SELECT slug, state, city, updated_at,
             enriched_history, enriched_academics,
             enriched_campus_info, enriched_student_life
      FROM schools
      WHERE institution_category = 'university' ORDER BY state, name
    `;
    return rows.filter((r) => assessContentQuality(r).indexable).map((r) => ({
      slug: r.slug as string,
      state: toSlug(r.state as string),
      city: toSlug((r.city ?? r.state) as string),
      updated_at: r.updated_at as string,
    }));
  } catch { return []; }
}

async function getBlogPosts() {
  try {
    const posts = await getContent().getAllPosts();
    return posts.map((p) => ({ slug: p.slug, publishedAt: p.publishedAt }));
  } catch { return []; }
}
