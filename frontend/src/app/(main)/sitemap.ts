import { MetadataRoute } from 'next';
import { getContent } from '@/lib/content';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nigeriandirectory.com.ng';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Last time the site structure changed — update this when adding new static pages
const SITE_UPDATED = new Date('2026-10-19');

// All 36 states + FCT
const STATES = [
  'abia', 'adamawa', 'akwa-ibom', 'anambra', 'bauchi', 'bayelsa',
  'benue', 'borno', 'cross-river', 'delta', 'ebonyi', 'edo',
  'ekiti', 'enugu', 'fct', 'gombe', 'imo', 'jigawa',
  'kaduna', 'kano', 'katsina', 'kebbi', 'kogi', 'kwara',
  'lagos', 'nasarawa', 'niger', 'ogun', 'ondo', 'osun',
  'oyo', 'plateau', 'rivers', 'sokoto', 'taraba', 'yobe', 'zamfara',
];

// ─── Data fetchers ────────────────────────────────────────────────────────────

async function getAllSchools(): Promise<
  Array<{ state: string; area: string; slug: string; updated_at: string }>
> {
  try {
    // Schools: 408 records — one request is sufficient
    const res = await fetch(
      `${API_URL}/schools?institution_category=school&limit=500`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? []).map(
      (s: { state: string; area: string; slug: string; updated_at: string }) => ({
        state: s.state.toLowerCase().replace(/ /g, '-'),
        area: (s.area ?? s.state).toLowerCase().replace(/ /g, '-'),
        slug: s.slug,
        updated_at: s.updated_at,
      }),
    );
  } catch {
    return [];
  }
}

async function getAllUniversities(): Promise<
  Array<{ state: string; city: string; slug: string; updated_at: string }>
> {
  try {
    // Universities: 304 records — two parallel requests to be future-proof
    const [r1, r2] = await Promise.all([
      fetch(`${API_URL}/schools?institution_category=university&limit=500&offset=0`, {
        next: { revalidate: 3600 },
      }),
      fetch(`${API_URL}/schools?institution_category=university&limit=500&offset=500`, {
        next: { revalidate: 3600 },
      }),
    ]);
    const [d1, d2] = await Promise.all([
      r1.ok ? r1.json() : { data: [] },
      r2.ok ? r2.json() : { data: [] },
    ]);
    return [...(d1.data ?? []), ...(d2.data ?? [])].map(
      (u: { state: string; city: string; slug: string; updated_at: string }) => ({
        state: u.state.toLowerCase().replace(/ /g, '-'),
        city: (u.city ?? u.state).toLowerCase().replace(/ /g, '-'),
        slug: u.slug,
        updated_at: u.updated_at,
      }),
    );
  } catch {
    return [];
  }
}

async function getBlogPosts(): Promise<Array<{ slug: string; publishedAt: string }>> {
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
    getAllSchools(),
    getAllUniversities(),
    getBlogPosts(),
  ]);

  // ── Static pages ──────────────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: SITE_UPDATED,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/education/schools/`,
      lastModified: SITE_UPDATED,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/education/universities/`,
      lastModified: SITE_UPDATED,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/blog/`,
      lastModified: SITE_UPDATED,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/about/`,
      lastModified: SITE_UPDATED,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/contact/`,
      lastModified: SITE_UPDATED,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/claim/`,
      lastModified: SITE_UPDATED,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // ── State listing pages ───────────────────────────────────────────────────
  const schoolStatePages: MetadataRoute.Sitemap = STATES.map((state) => ({
    url: `${BASE_URL}/education/schools/${state}/`,
    lastModified: SITE_UPDATED,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const universityStatePages: MetadataRoute.Sitemap = STATES.map((state) => ({
    url: `${BASE_URL}/education/universities/${state}/`,
    lastModified: SITE_UPDATED,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // ── School profile pages (/education/schools/[state]/[area]/[slug]/) ──────
  const schoolPages: MetadataRoute.Sitemap = schools.map((s) => ({
    url: `${BASE_URL}/education/schools/${s.state}/${s.area}/${s.slug}/`,
    lastModified: s.updated_at ? new Date(s.updated_at) : SITE_UPDATED,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  // ── School blog pages ─────────────────────────────────────────────────────
  const schoolBlogPages: MetadataRoute.Sitemap = schools.map((s) => ({
    url: `${BASE_URL}/education/schools/${s.state}/${s.area}/${s.slug}/blog/`,
    lastModified: s.updated_at ? new Date(s.updated_at) : SITE_UPDATED,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // ── University profile pages (/education/universities/[state]/[city]/[slug]/)
  const universityPages: MetadataRoute.Sitemap = universities.map((u) => ({
    url: `${BASE_URL}/education/universities/${u.state}/${u.city}/${u.slug}/`,
    lastModified: u.updated_at ? new Date(u.updated_at) : SITE_UPDATED,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  // ── Blog post pages ───────────────────────────────────────────────────────
  const blogPostPages: MetadataRoute.Sitemap = blogPosts.map((p) => ({
    url: `${BASE_URL}/blog/${p.slug}/`,
    lastModified: new Date(p.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [
    ...staticPages,        //   7 pages
    ...schoolStatePages,   //  37 pages
    ...universityStatePages, // 37 pages
    ...schoolPages,        // 408 pages
    ...schoolBlogPages,    // 408 pages
    ...universityPages,    // 304 pages
    ...blogPostPages,      // n  pages
  ];
}
