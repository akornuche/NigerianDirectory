/**
 * API client for fetching data from the backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface FetchOptions extends RequestInit {
  timeout?: number;
}

class APIError extends Error {
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
  const { timeout = 10000, ...fetchOptions } = options;

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

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
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

  getSchoolsByState: (state: string, page = 1, limit = 20) =>
    apiRequest<SchoolsResponse>(
      `/schools/state/${state}?page=${page}&limit=${limit}`
    ),

  getSchoolsByArea: (state: string, area: string, page = 1, limit = 20) =>
    apiRequest<SchoolsResponse>(
      `/schools/area/${state}/${area}?page=${page}&limit=${limit}`
    ),

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
export const getFeaturedSchools = api.getFeaturedSchools;
export const getSchoolsByState = api.getSchoolsByState;
export const getSchoolsByArea = api.getSchoolsByArea;
export const getStates = api.getStates;

export default api;
