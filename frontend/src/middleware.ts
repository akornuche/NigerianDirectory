import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for handling redirects and route transformations
 * 
 * This middleware handles:
 * 1. 301 redirects from old /schools/* URLs to /education/schools/*
 * 2. Route validation for coming-soon pages
 */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 301 Redirect: /schools/* -> /education/schools/*
  // This preserves SEO value while transitioning to the new URL structure
  if (pathname.startsWith('/schools/') || pathname === '/schools') {
    const newPath = pathname.replace('/schools', '/education/schools');
    const url = request.nextUrl.clone();
    url.pathname = newPath;
    
    return NextResponse.redirect(url, {
      status: 301, // Permanent redirect for SEO
    });
  }

  // Handle /states redirect to education/schools (states page now goes to schools)
  if (pathname === '/states' || pathname === '/states/') {
    const url = request.nextUrl.clone();
    url.pathname = '/education/schools';
    return NextResponse.redirect(url, { status: 301 });
  }

  return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    // Match /schools and all sub-paths
    '/schools/:path*',
    '/schools',
    // Match /states
    '/states',
    '/states/',
  ],
};
