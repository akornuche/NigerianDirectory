/**
 * Browser-side helper for the admin screens. Sends the admin's bearer token
 * (stored at login) and turns error responses into thrown Errors carrying
 * the API's message.
 */
import { toLocationSegment, toSlugSegment } from './slug';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || body.message || `HTTP ${res.status}`);
  return body as T;
}

export function wordCount(...texts: Array<string | null | undefined>): number {
  return texts.join(' ').trim().split(/\s+/).filter(Boolean).length;
}

/** Public URL of a record, built with the same rules as the directory pages. */
export function publicPath(r: { institution_category: string; state: string; city?: string | null; area?: string | null; slug: string }) {
  const section = r.institution_category === 'university' ? 'universities' : 'schools';
  const locality = r.institution_category === 'university' ? toSlugSegment(r.city) : toLocationSegment(r.area, r.city);
  return `/education/${section}/${toSlugSegment(r.state)}/${locality}/${r.slug}/`;
}
