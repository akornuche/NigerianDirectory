/**
 * Browser-side helper for the admin screens. Sends the admin's bearer token
 * (stored at login) and turns error responses into thrown Errors carrying
 * the API's message.
 *
 * Access tokens last 15 minutes. When one expires the API answers 401; the
 * helper then trades the stored refresh token (7 days) for a new pair once
 * and retries the request, so an admin stays signed in while working. If
 * the refresh fails too, the stored session is cleared and the browser goes
 * back to the login page.
 */
import { toLocationSegment, toSlugSegment } from './slug';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export const SESSION_KEYS = ['auth_token', 'auth_refresh', 'auth_role', 'auth_name', 'auth_email'];

export function saveSession(accessToken: string, refreshToken?: string) {
  localStorage.setItem('auth_token', accessToken);
  if (refreshToken) localStorage.setItem('auth_refresh', refreshToken);
}

export function clearSession() {
  SESSION_KEYS.forEach((k) => localStorage.removeItem(k));
}

// One refresh at a time: pages often fire several requests at once, and the
// API retires a refresh token as soon as it is used.
let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const refreshToken = localStorage.getItem('auth_refresh');
  if (!refreshToken) return false;
  if (!refreshing) {
    refreshing = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const body = await res.json();
        if (!body.accessToken) return false;
        saveSession(body.accessToken, body.refreshToken);
        return true;
      })
      .catch(() => false)
      .finally(() => { setTimeout(() => { refreshing = null; }, 0); });
  }
  return refreshing;
}

function sendToLogin() {
  clearSession();
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/login')) {
    window.location.replace('/admin/login/?expired=1');
  }
}

async function send(path: string, init: RequestInit) {
  const token = localStorage.getItem('auth_token');
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await send(path, init);
  if (res.status === 401) {
    if (await refreshSession()) {
      res = await send(path, init);
    }
    if (res.status === 401) {
      sendToLogin();
      throw new Error('Your session has ended. Please sign in again.');
    }
  }
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
