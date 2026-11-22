/**
 * AI-Optimized Sitemap for Generative Engines
 * ==========================================
 * Special sitemap designed for AI agents and generative engines
 * to discover and index Nigerian school information.
 */

import { neon } from '@neondatabase/serverless';
import { toSlugSegment } from '@/lib/slug';
import { assessContentQuality } from '@/lib/content-quality';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nigeriandirectory.com.ng';

export const dynamic = 'force-dynamic';

/**
 * Shape consumed from /api/ai/schools when building the sitemap.
 *
 * Only the fields this route reads are declared. Everything is optional
 * except name, because the AI endpoint enriches records progressively and
 * may omit sections for institutions that have not been processed yet.
 */
interface AiSitemapSchool {
  name: string;
  type?: string;
  city?: string;
  state?: string;
  area?: string;
  institution_category?: string;
  updated_at?: string;
  seo?: { url_slug?: string };
  location?: { full_address?: string; city?: string; state?: string };
  education?: { type?: string };
}

export async function GET() {
  try {
    // Read the complete directory so the AI sitemap does not inherit the API's
    // featured-results limit or omit universities from the canonical URL set.
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`
            SELECT name, type, city, state, area, slug, updated_at, institution_category,
              enriched_history, enriched_academics,
              enriched_campus_info, enriched_student_life
      FROM schools
      WHERE institution_category IN ('school', 'university')
        AND verification_status = 'verified'
      ORDER BY institution_category, state, name
    `;
    const schools: AiSitemapSchool[] = rows
      .filter((row) => assessContentQuality(row).indexable)
      .map((row) => ({
      name: row.name as string,
      type: row.type as string | undefined,
      city: row.city as string | undefined,
      state: row.state as string | undefined,
      area: row.area as string | undefined,
      institution_category: row.institution_category as string | undefined,
      updated_at: row.updated_at as string | undefined,
      seo: { url_slug: row.slug as string },
      location: {
        full_address: `${row.city || row.state}, ${row.state}, Nigeria`,
        city: row.city as string | undefined,
        state: row.state as string | undefined,
      },
      education: { type: row.type as string | undefined },
      }));

    // Generate AI-optimized sitemap
    const aiSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  
  <!-- Only real pages are listed. Earlier versions listed /ai, /api/ai/*
       paths on the website domain and category pages, none of which
       exist, so every one of those URLs returned 404. -->
  <url>
    <loc>${baseUrl}/for-ai-agents/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- State listing pages with at least one published record -->
  ${stateListingUrls(schools, baseUrl)}

  <!-- Individual Schools -->
  ${schools.map(school => `
  <url>
    <loc>${getCanonicalSchoolUrl(school)}</loc>
    <lastmod>${new Date(school.updated_at || Date.now()).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}

</urlset>`;

    return new Response(aiSitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=86400', // 24 hours
        'X-AI-Optimized': 'true'
      },
    });

  } catch (error) {
    console.error('AI Sitemap generation error:', error);
    
    // Return minimal AI sitemap on error
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/api/ai/schools</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/api/ai/context/nigeria-education</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`;

    return new Response(fallbackSitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600' // 1 hour for error case
      },
    });
  }
}

function stateListingUrls(schools: AiSitemapSchool[], baseUrl: string): string {
  const today = new Date().toISOString().split('T')[0];
  const paths = new Set<string>();
  for (const school of schools) {
    const section = school.institution_category === 'university' ? 'universities' : 'schools';
    if (school.state) paths.add(`/education/${section}/${toSlug(school.state)}/`);
  }
  return Array.from(paths).sort().map((path) => `
  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('');
}

function toSlug(value: string | undefined): string {
  return toSlugSegment(value || '');
}

function getCanonicalSchoolUrl(school: AiSitemapSchool): string {
  const slug = school.seo?.url_slug || toSlug(school.name);
  const state = toSlug(school.state);

  if (school.institution_category === 'university') {
    return `${baseUrl}/education/universities/${state}/${toSlug(school.city || school.state)}/${slug}/`;
  }

  return `${baseUrl}/education/schools/${state}/${toSlug(school.area || school.state)}/${slug}/`;
}
