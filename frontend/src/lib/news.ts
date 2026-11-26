/**
 * The daily news digest: types, API calls and date formatting shared by the
 * /news pages. Dates are calendar days in Nigeria (YYYY-MM-DD); they are
 * formatted in UTC so a day never shifts by the reader's time zone.
 */

const API_URL =
  typeof window === 'undefined'
    ? (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api')
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api');

export interface NewsDaySummary {
  day: string;
  lead: string | null;
  story_count: number;
  headlines: string[];
}

export interface NewsMonth {
  month: string; // YYYY-MM
  days: NewsDaySummary[];
}

export interface NewsSource {
  name: string;
  url: string;
}

export interface NewsItem {
  rank: number;
  headline: string;
  summary: string;
  category: string;
  states: string[];
  sources: NewsSource[];
  /** Directory records the story mentions, and the pages of its states. */
  links?: { name: string; path: string }[];
  state_links?: { name: string; path: string }[];
}

export interface NewsDay {
  day: string;
  lead: string | null;
  published_at: string | null;
  items: NewsItem[];
  older: string | null;
  newer: string | null;
}

export const CATEGORY_LABELS: Record<string, string> = {
  politics: 'Politics',
  economy: 'Economy',
  business: 'Business',
  security: 'Security',
  education: 'Education',
  health: 'Health',
  world: 'Nigeria and the world',
  sports: 'Sports',
  technology: 'Technology',
  entertainment: 'Entertainment',
  society: 'Society',
  environment: 'Environment',
};

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 300 } } as RequestInit);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const newsApi = {
  months: (before?: string, limit = 3) =>
    get<{ months: NewsMonth[]; next: string | null }>(
      `/news/months?limit=${limit}${before ? `&before=${before}` : ''}`
    ),
  month: (ym: string) =>
    get<{ month: string; days: NewsDaySummary[]; older: string | null; newer: string | null }>(`/news/month/${ym}`),
  day: (date: string) => get<NewsDay>(`/news/day/${date}`),
  days: () => get<{ days: string[] }>(`/news/days`),
  search: (q: string, category?: string, page = 1) =>
    get<NewsSearch>(
      `/news/search?q=${encodeURIComponent(q)}${category ? `&category=${encodeURIComponent(category)}` : ''}&page=${page}`
    ),
};

export interface NewsSearchResult {
  day: string;
  rank: number;
  headline: string;
  summary: string;
  category: string;
}

export interface NewsSearch {
  q: string;
  category: string | null;
  page: number;
  total: number;
  pages: number;
  results: NewsSearchResult[];
}

/** Address of one story inside its day page. */
export const storyPath = (ymd: string, rank: number) => `${dayPath(ymd)}#story-${rank}`;

const asDate = (ymd: string) => new Date(`${ymd.length === 7 ? `${ymd}-01` : ymd}T12:00:00Z`);

export const formatMonth = (ym: string) =>
  asDate(ym).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export const formatDay = (ymd: string) =>
  asDate(ymd).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export const formatShortDay = (ymd: string) =>
  asDate(ymd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export const weekday = (ymd: string) =>
  asDate(ymd).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' });

export const dayPath = (ymd: string) => `/news/${ymd.slice(0, 4)}/${ymd.slice(5, 7)}/${ymd.slice(8, 10)}/`;
export const monthPath = (ym: string) => `/news/${ym.slice(0, 4)}/${ym.slice(5, 7)}/`;
