import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { GONE_SLUGS } from '@/lib/goneSlugs';

/**
 * Middleware for redirects and removed pages:
 * 1. 410 Gone for profiles of records removed for good (see lib/goneSlugs.ts)
 * 2. 301 from old /schools/* URLs to /education/schools/*
 * 3. 301 from /states to the state list on the universities page
 */

// /education/{schools|universities}/{state}/{locality}/{slug}/... or the
// legacy /schools/{state}/{locality}/{slug}/...
const RECORD_PATH = /^\/(?:education\/(?:schools|universities)|schools)\/[^/]+\/[^/]+\/([^/]+)(?:\/|$)/;

const GONE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Page removed | Nigerian Directory</title></head>
<body style="font-family:system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1rem;color:#121826">
<h1>This listing has been removed</h1>
<p>We removed this record because it could not be verified against official sources.</p>
<p><a href="/education/universities/">Browse universities</a> or <a href="/education/schools/">browse schools</a>.</p>
</body></html>`;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const record = RECORD_PATH.exec(pathname);
  if (record && GONE_SLUGS.has(record[1])) {
    return new NextResponse(GONE_HTML, {
      status: 410,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'x-robots-tag': 'noindex',
        'cache-control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  }

  // 301 Redirect: /schools/* -> /education/schools/*
  if (pathname.startsWith('/schools/') || pathname === '/schools') {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace('/schools', '/education/schools');
    return NextResponse.redirect(url, { status: 301 });
  }

  // /states has no page of its own: send it to the state list on the universities page
  if (pathname === '/states' || pathname === '/states/') {
    const url = request.nextUrl.clone();
    url.pathname = '/education/universities/';
    url.hash = 'states';
    return NextResponse.redirect(url, { status: 301 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/schools',
    '/schools/:path*',
    '/states',
    '/states/',
    // Record profiles (and their sub-pages), for the 410 check only.
    '/education/schools/:state/:locality/:slug/:rest*',
    '/education/universities/:state/:locality/:slug/:rest*',
  ],
};
