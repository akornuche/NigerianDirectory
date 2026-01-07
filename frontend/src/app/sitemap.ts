import { MetadataRoute } from 'next';
import { getContent } from '@/lib/content';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nigeriandirectory.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Nigerian states
const states = [
  'lagos', 'fct', 'rivers', 'oyo', 'kano', 'kaduna', 'enugu', 'anambra',
  'delta', 'edo', 'abia', 'imo', 'cross-river', 'ogun', 'osun', 'ondo',
  'ekiti', 'kwara', 'kogi', 'benue', 'plateau', 'nasarawa', 'niger',
  'sokoto', 'zamfara', 'kebbi', 'katsina', 'jigawa', 'bauchi', 'gombe',
  'adamawa', 'taraba', 'borno', 'yobe', 'bayelsa', 'akwa-ibom', 'ebonyi'
];

// Fetch all schools from database for sitemap
async function getAllSchools(): Promise<Array<{ state: string; area: string; slug: string; updated_at: string }>> {
  try {
    const response = await fetch(`${API_URL}/schools?limit=1000`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.data?.map((school: { state: string; area: string; slug: string; updated_at: string }) => ({
      state: school.state.toLowerCase().replace(/ /g, '-'),
      area: school.area.toLowerCase().replace(/ /g, '-'),
      slug: school.slug,
      updated_at: school.updated_at,
    })) || [];
  } catch (error) {
    console.error('Error fetching schools for sitemap:', error);
    return [];
  }
}

// Fetch blog posts for sitemap
async function getBlogPosts(): Promise<Array<{ slug: string; publishedAt: string }>> {
  try {
    const content = getContent();
    const posts = await content.getAllPosts();
    return posts.map((post) => ({
      slug: post.slug,
      publishedAt: post.publishedAt,
    }));
  } catch (error) {
    console.error('Error fetching blog posts for sitemap:', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const currentDate = new Date();
  const schools = await getAllSchools();
  const blogPosts = await getBlogPosts();

  // Static pages - only include live pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/about/`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/contact/`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/education/schools/`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/blog/`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/claim/`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  // State listing pages - updated to new URL structure
  const statePages: MetadataRoute.Sitemap = states.map((state) => ({
    url: `${BASE_URL}/education/schools/${state}/`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // School profile pages - updated to new URL structure
  const schoolPages: MetadataRoute.Sitemap = schools.map((school) => ({
    url: `${BASE_URL}/education/schools/${school.state}/${school.area}/${school.slug}/`,
    lastModified: school.updated_at ? new Date(school.updated_at) : currentDate,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  // School blog pages - updated to new URL structure
  const schoolBlogPages: MetadataRoute.Sitemap = schools.map((school) => ({
    url: `${BASE_URL}/education/schools/${school.state}/${school.area}/${school.slug}/blog/`,
    lastModified: school.updated_at ? new Date(school.updated_at) : currentDate,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // Main blog posts
  const blogPostPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}/`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  // Note: Coming Soon pages are intentionally excluded from sitemap
  // Non-live verticals (/health/, /food/, /home-services/, /real-estate/, 
  // /automotive/, /travel/, /business/) are not included

  return [
    ...staticPages, 
    ...statePages, 
    ...schoolPages, 
    ...schoolBlogPages,
    ...blogPostPages,
  ];
}
