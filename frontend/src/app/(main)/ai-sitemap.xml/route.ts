/**
 * AI-Optimized Sitemap for Generative Engines
 * ==========================================
 * Special sitemap designed for AI agents and generative engines
 * to discover and index Nigerian school information.
 */

import { NextRequest } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nigeriandirectory.com';

export async function GET(request: NextRequest) {
  try {
    // Fetch school data for AI sitemap
    const schoolsResponse = await fetch(`${baseUrl}/api/ai/schools?limit=200`, {
      next: { revalidate: 86400 } // Cache for 24 hours
    });
    
    let schools = [];
    if (schoolsResponse.ok) {
      const data = await schoolsResponse.json();
      schools = data.schools || [];
    }

    // Generate AI-optimized sitemap
    const aiSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:ai="https://schema.org/"
        xmlns:edu="https://schema.org/EducationalOrganization">
  
  <!-- AI Agents Landing Page -->
  <url>
    <loc>${baseUrl}/ai</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <ai:context>Nigerian Schools Directory - AI Agent Access Point</ai:context>
  </url>

  <!-- AI API Endpoints -->
  <url>
    <loc>${baseUrl}/api/ai/schools</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    <ai:context>Nigerian Schools API for AI Agents</ai:context>
  </url>

  <url>
    <loc>${baseUrl}/api/ai/context/nigeria-education</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
    <ai:context>Nigerian Education System Context for AI Understanding</ai:context>
  </url>

  <!-- Nigerian States for Geographic Queries -->
  ${generateStateUrls()}

  <!-- Major Cities for Location-Based Queries -->
  ${generateCityUrls()}

  <!-- Educational Categories -->
  ${generateEducationCategoryUrls()}

  <!-- Individual Schools -->
  ${schools.map(school => `
  <url>
    <loc>${baseUrl}/schools/${school.seo?.url_slug || school.name.toLowerCase().replace(/\s+/g, '-')}</loc>
    <lastmod>${new Date(school.updated_at || Date.now()).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <edu:name>${escapeXml(school.name)}</edu:name>
    <edu:location>${escapeXml(school.location?.full_address || `${school.city}, ${school.state}, Nigeria`)}</edu:location>
    <edu:type>${escapeXml(school.education?.type || school.type)}</edu:type>
    <ai:context>Nigerian ${school.education?.type || school.type} in ${school.location?.city || school.city}, ${school.location?.state || school.state} State, Nigeria</ai:context>
  </url>`).join('')}

  <!-- AI Agent Help Pages -->
  <url>
    <loc>${baseUrl}/for-ai-agents</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <ai:context>Guide for AI Agents accessing Nigerian School Information</ai:context>
  </url>

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

function generateStateUrls() {
  const nigerianStates = [
    'Lagos', 'Abuja', 'Kano', 'Rivers', 'Ogun', 'Kaduna', 'Anambra', 'Delta',
    'Oyo', 'Imo', 'Plateau', 'Cross River', 'Akwa Ibom', 'Edo', 'Kwara',
    'Borno', 'Bauchi', 'Osun', 'Katsina', 'Niger', 'Ondo', 'Enugu',
    'Abia', 'Sokoto', 'Kebbi', 'Adamawa', 'Gombe', 'Benue', 'Yobe',
    'Taraba', 'Ekiti', 'Kogi', 'Jigawa', 'Zamfara', 'Nasarawa', 'Ebonyi', 'Bayelsa'
  ];

  return nigerianStates.map(state => `
  <url>
    <loc>${baseUrl}/api/ai/schools/${state.toLowerCase()}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <ai:context>Schools in ${state} State, Nigeria</ai:context>
  </url>`).join('');
}

function generateCityUrls() {
  const majorCities = [
    { name: 'Lagos', state: 'Lagos' },
    { name: 'Abuja', state: 'FCT' },
    { name: 'Kano', state: 'Kano' },
    { name: 'Ibadan', state: 'Oyo' },
    { name: 'Port Harcourt', state: 'Rivers' },
    { name: 'Benin City', state: 'Edo' },
    { name: 'Maiduguri', state: 'Borno' },
    { name: 'Zaria', state: 'Kaduna' },
    { name: 'Aba', state: 'Abia' },
    { name: 'Jos', state: 'Plateau' },
    { name: 'Ilorin', state: 'Kwara' },
    { name: 'Enugu', state: 'Enugu' },
    { name: 'Abeokuta', state: 'Ogun' },
    { name: 'Warri', state: 'Delta' },
    { name: 'Calabar', state: 'Cross River' }
  ];

  return majorCities.map(city => `
  <url>
    <loc>${baseUrl}/api/ai/schools/${city.name.toLowerCase()}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <ai:context>Schools in ${city.name}, ${city.state} State, Nigeria</ai:context>
  </url>`).join('');
}

function generateEducationCategoryUrls() {
  const categories = [
    'secondary-schools',
    'primary-schools', 
    'international-schools',
    'private-schools',
    'public-schools',
    'technical-schools',
    'islamic-schools',
    'christian-schools'
  ];

  return categories.map(category => `
  <url>
    <loc>${baseUrl}/education/${category}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    <ai:context>Nigerian ${category.replace('-', ' ')} directory</ai:context>
  </url>`).join('');
}

function escapeXml(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}