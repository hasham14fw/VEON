import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';
import {verifySessionToken} from '@/lib/horizon/auth';

export function middleware(request: NextRequest) {
  const {pathname} = request.nextUrl;

  // 1. Allow public static assets and auth API endpoints
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/brand') ||
    pathname.startsWith('/data') ||
    pathname.startsWith('/references') ||
    pathname === '/favicon.svg' ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }

  // 2. Validate horizon_session cookie with multi-user & 12-hour expiration check
  const sessionCookie = request.cookies.get('horizon_session');
  const cookieVal = sessionCookie?.value ? decodeURIComponent(sessionCookie.value) : '';
  const authenticatedUser = cookieVal ? verifySessionToken(cookieVal) : null;
  const isAuthenticated = !!authenticatedUser;

  // 3. Unauthenticated access -> redirect to /login
  if (!isAuthenticated) {
    if (pathname === '/login') {
      return NextResponse.next();
    }
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({error: 'Authentication required'}, {status: 401});
    }
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    // Remove expired or invalid cookie on redirect
    if (sessionCookie) {
      response.cookies.delete('horizon_session');
    }
    return response;
  }

  // 4. Authenticated user visiting /login -> redirect to main workspace /
  if (isAuthenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files, images, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|favicon.svg|brand/.*|data/.*).*)',
  ],
};
