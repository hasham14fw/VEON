import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

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

  // 2. Validate horizon_session cookie
  const sessionCookie = request.cookies.get('horizon_session');
  const validUser = process.env.HORIZON_USERNAME || 'zohair';
  const validPass = process.env.HORIZON_PASSWORD || 'veon12345';
  const expectedToken = btoa(`${validUser}:${validPass}`);

  const isAuthenticated = sessionCookie?.value
    ? decodeURIComponent(sessionCookie.value) === expectedToken || sessionCookie.value === expectedToken
    : false;

  // 3. Unauthenticated access -> redirect to /login
  if (!isAuthenticated) {
    if (pathname === '/login') {
      return NextResponse.next();
    }
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({error: 'Authentication required'}, {status: 401});
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
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
