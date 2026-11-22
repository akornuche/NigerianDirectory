/**
 * API client for fetching data from the backend
 */

// Browser always uses the public URL (localhost:5000)
// Server-side rendering inside Docker uses the internal service name
const API_URL =
  typeof window === 'undefined'
    ? (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api')
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api');

// Bump after bulk data changes; see apiRequest.
const DATA_VERSION = '2026-11-22';

interface FetchOptions extends RequestInit {
  timeout?: number;
}

export class APIError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  // A cold start can chain a serverless wake with a managed-database wake,
  // which together measured over eleven seconds in production. A ten second
  // budget aborted those requests, and because callers fall back to empty
  // results the page rendered as though no records existed. That is
  // particularly damaging when a search crawler sees the empty version.
  const { timeout = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  // Server-side renders come from a few server IPs, so the API's per-IP rate
  // limit would throttle page builds. They identify themselves with a shared
  // key. INTERNAL_API_KEY is not exposed to the browser (it is not
  // NEXT_PUBLIC_ and not listed in next.config.js `env`), and the header is
  // only added when running on the server.
  const internalKey =
    typeof window === 'undefined' ? process.env.INTERNAL_API_KEY : undefined;

  const { headers: extraHeaders, ...rest } = options;
  const defaultOptions: RequestInit = {
    // Next.js caches server-side fetch() responses in the Vercel Data Cache
    // by default, and that cache survives deployments. Without an explicit
    // lifetime, pages kept serving API responses stored before records were
    // unpublished or corrected. Responses may be reused for at most five
    // minutes; callers can pass their own `cache` or `next` options.
    next: { revalidate: 300 },
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      // Part of the Data Cache key. Bump DATA_VERSION after a bulk data
      // change (verification, corrections) to stop serving older cached
      // API responses immediately.
      'X-Data-Version': DATA_VERSION,
      ...(internalKey ? { 'X-Internal-API-Key': internalKey } : {}),
      ...(extraHeaders as Record<string, string> | undefined),
    },
  };

  try {
    const response = await fetchWithTimeout(url, defaultOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.message || `HTTP error ${response.status}`,
        response.status,
        errorData
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new APIError('Request timeout', 408);
      }
      throw new APIError(error.message, 500);
    }
    throw new APIError('Unknown error', 500);
  }
}

// School types
export interface School {
  id: string;
  name: string;
  slug: string;
  type: string;
  state: string;
  city: string;
  area: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  curriculum?: string;
  levels?: string;
  boarding: boolean;
  day_school: boolean;
  gender?: string;
  phone?: string;
  email?: string;
  website?: string;
  social_links?: Record<string, string>;
  template_summary?: string;
  ai_summary?: string;
  // Enriched content fields for unique SEO content
  enriched_history?: string;
  enriched_academics?: string;
  enriched_student_life?: string;
  enriched_notable_alumni?: string[];
  enriched_recent_news?: string[];
  enriched_campus_info?: string;
  enriched_at?: string;
  // Content sources for outbound links and attribution.
  // The crawler emits 'official_website' for pages on the institution's own
  // domain and 'web_search' for anything discovered through search. The
  // previous union listed values the API never sends.
  content_sources?: Array<{
    url: string;
    title?: string;
    type?: 'official_website' | 'web_search' | string;
    confidence?: number;
  }>;
  established_year?: number;
  principal_name?: string;
  principal_title?: string;
  principal_image_url?: string;
  management_info?: Array<{
    name: string;
    title: string;
    image_url?: string;
  }>;
  facilities?: string[];
  achievements?: string[];
  student_life?: Record<string, string>;
  fee_range?: string;
  student_count?: number;
  logo_url?: string;
  hero_image_url?: string;
  gallery_images?: string[];
  meta_title?: string;
  meta_description?: string;
  claimed: boolean;
  verified: boolean;
  featured: boolean;
  institution_category: 'school' | 'university' | 'polytechnic' | 'college' | 'hospital';
  // University-specific fields
  accreditation?: string;
  faculties?: string[];
  programmes?: string[];
  vc_name?: string;
  vc_title?: string;
  student_population?: number;
  postgraduate?: boolean;
  distance_learning?: boolean;
  year_chartered?: number;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  state: string;
  city: string;
  area?: string;
  school_count?: number;
}

export interface SchoolsResponse {
  schools: School[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// API functions
export const api = {
  // Schools
  getSchools: (page = 1, limit = 20, params?: Record<string, string | number>) =>
    apiRequest<SchoolsResponse>(
      `/schools?page=${page}&limit=${limit}${params ? '&' + new URLSearchParams(params as Record<string, string>).toString() : ''}`
    ),

  getSchoolBySlug: (slug: string) => apiRequest<School>(`/schools/${slug}`),

  getSchoolByPath: (state: string, area: string, slug: string) =>
    apiRequest<School>(`/schools/${state}/${area}/${slug}`),

  getSchoolBlogData: (slug: string) =>
    apiRequest<{
      school: School;
      relatedSchools: School[];
      blogContent: {
        title: string;
        metaTitle: string;
        metaDescription: string;
        sections: Array<{
          title: string;
          content: string;
        }>;
      };
    }>(`/schools/${slug}/blog`),

  getFeaturedSchools: () => apiRequest<School[]>('/schools/featured'),

  // The backend route /schools/state/:state returns every school in the
  // state and accepts no pagination parameters, so none are taken here.
  getSchoolsByState: (state: string) =>
    apiRequest<{
      state: string;
      schoolCount: number;
      areas: string[];
      schools: School[];
    }>(`/schools/state/${state}`),

  getSchoolsByArea: (state: string, area: string, page = 1, limit = 20) =>
    apiRequest<SchoolsResponse>(
      `/schools/area/${state}/${area}?page=${page}&limit=${limit}`
    ),

  // Universities — use schools endpoint filtered by institution_category
  getUniversities: (page = 1, limit = 20, params?: Record<string, string | number>) =>
    apiRequest<SchoolsResponse>(
      `/schools?page=${page}&limit=${limit}&institution_category=university${params ? '&' + new URLSearchParams(params as Record<string, string>).toString() : ''}`
    ),

  getUniversitiesByState: (state: string, limit = 100) =>
    apiRequest<SchoolsResponse>(
      `/schools?page=1&limit=${limit}&institution_category=university&state=${encodeURIComponent(state)}`
    ),

  getUniversityByPath: (state: string, city: string, slug: string) =>
    apiRequest<School>(`/schools/${state}/${city}/${slug}`),

  // Hospitals — same pattern as universities, filtered by institution_category
  getHospitals: (page = 1, limit = 20, params?: Record<string, string | number>) =>
    apiRequest<SchoolsResponse>(
      `/schools?page=${page}&limit=${limit}&institution_category=hospital${params ? '&' + new URLSearchParams(params as Record<string, string>).toString() : ''}`
    ),

  getHospitalsByState: (state: string, limit = 100) =>
    apiRequest<SchoolsResponse>(
      `/schools?page=1&limit=${limit}&institution_category=hospital&state=${encodeURIComponent(state)}`
    ),

  getHospitalByPath: (state: string, city: string, slug: string) =>
    apiRequest<School>(`/schools/${state}/${city}/${slug}`),

  // Locations
  getStates: () => apiRequest<Location[]>('/locations/states'),

  getCitiesByState: (state: string) =>
    apiRequest<Location[]>(`/locations/state/${state}`),

  getAreasByCity: (state: string, city: string) =>
    apiRequest<Location[]>(`/locations/state/${state}/city/${city}`),

  getCitiesWithSchools: () =>
    apiRequest<Location[]>('/locations/cities-with-schools'),

  searchLocations: (query: string) =>
    apiRequest<Location[]>(`/locations/search?q=${encodeURIComponent(query)}`),

  getLocationStats: () =>
    apiRequest<{
      totalStates: number;
      totalCities: number;
      totalAreas: number;
    }>('/locations/stats'),

  // Stats
  getStats: () =>
    apiRequest<{
      totalSchools: number;
      schoolsByType: Record<string, number>;
      schoolsByState: Record<string, number>;
    }>('/schools/stats'),
};

// Named exports for convenience
export const getSchoolBySlug = async (state: string, area: string, slug: string): Promise<School> => {
  return api.getSchoolByPath(state, area, slug);
};

export const getSchools = api.getSchools;
export const getSchoolByPath = api.getSchoolByPath;
export const getFeaturedSchools = api.getFeaturedSchools;
export const getSchoolsByState = api.getSchoolsByState;
export const getSchoolsByArea = api.getSchoolsByArea;
export const getStates = api.getStates;
export const getUniversities = api.getUniversities;
export const getUniversitiesByState = api.getUniversitiesByState;
export const getUniversityByPath = api.getUniversityByPath;
export const getHospitals = api.getHospitals;
export const getHospitalsByState = api.getHospitalsByState;
export const getHospitalByPath = api.getHospitalByPath;

export default api;


/**
 * Canonical path of a record the API reports as moved: merged into another
 * record, renamed, or corrected to a different state or locality. Returns
 * null for an ordinary "not found" or any other error.
 */
export function movedToPath(error: unknown): string | null {
  if (!(error instanceof APIError) || error.status !== 404) return null;
  const moved = (error.data as { movedTo?: {
    slug: string; state: string; locality: string; institution_category: string;
  } } | undefined)?.movedTo;
  if (!moved?.slug || !moved.state || !moved.locality) return null;
  const section = moved.institution_category === 'university' ? 'universities' : 'schools';
  return `/education/${section}/${moved.state}/${moved.locality}/${moved.slug}/`;
}
