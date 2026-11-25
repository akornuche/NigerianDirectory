import { MetadataRoute } from 'next';
import { neon } from '@neondatabase/serverless';
import { getContent } from '@/lib/content';
import { assessContentQuality } from '@/lib/content-quality';
import { toSlugSegment } from '@/lib/slug';

// ISR: generate once, cache for 24 hours
// Googlebot never triggers a cold DB query
export const revalidate = 3600;

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

// Must match the segments the pages link to and the API resolves.
const toSlug = (s: string) => toSlugSegment(s);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [schools, universities, blogPosts, newsDays] = await Promise.all([
    getSchools(),
    getUniversities(),
    getBlogPosts(),
    getNewsDays(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,                       lastModified: SITE_UPDATED, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE_URL}/education/schools/`,      lastModified: SITE_UPDATED, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE_URL}/education/universities/`, lastModified: SITE_UPDATED, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE_URL}/blog/`,                   lastModified: SITE_UPDATED, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE_URL}/about/`,                  lastModified: SITE_UPDATED, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/contact/`,                lastModified: SITE_UPDATED, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/privacy/`,                lastModified: SITE_UPDATED, changeFrequency: 'yearly',  priority: 0.3 },
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

  // The news digest: the archive, each month and each published day.
  const newsPages: MetadataRoute.Sitemap = newsDays.length
    ? [
        { url: `${BASE_URL}/news/`, lastModified: new Date(newsDays[0].updated_at), changeFrequency: 'daily', priority: 0.9 },
        ...Array.from(new Set(newsDays.map((d) => d.day.slice(0, 7)))).map((ym) => ({
          url: `${BASE_URL}/news/${ym.slice(0, 4)}/${ym.slice(5, 7)}/`,
          lastModified: new Date(newsDays.find((d) => d.day.startsWith(ym))!.updated_at),
          changeFrequency: 'daily' as const, priority: 0.6,
        })),
        ...newsDays.map((d) => ({
          url: `${BASE_URL}/news/${d.day.slice(0, 4)}/${d.day.slice(5, 7)}/${d.day.slice(8, 10)}/`,
          lastModified: new Date(d.updated_at),
          changeFrequency: 'monthly' as const, priority: 0.7,
        })),
      ]
    : [];

  return [
    ...staticPages,
    ...newsPages,       //   7
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
      WHERE institution_category = 'school' AND verification_status = 'verified' ORDER BY state, name
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
      WHERE institution_category = 'university' AND verification_status = 'verified' ORDER BY state, name
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

async function getNewsDays() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`
      SELECT TO_CHAR(day, 'YYYY-MM-DD') AS day, updated_at
      FROM news_days WHERE status = 'published' ORDER BY day DESC
    `;
    return rows.map((r) => ({ day: r.day as string, updated_at: r.updated_at as string }));
  } catch { return []; }
}
