import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect portal routes (except login page and auth API)
  if (pathname.startsWith('/portal/ticket') || pathname.startsWith('/portal/tickets')) {
    const portalSession = req.cookies.get('portal_session');

    if (!portalSession?.value) {
      // Redirect to portal login
      return NextResponse.redirect(new URL('/portal', req.url));
    }
  }

  // Only protect admin routes (except login page and auth API)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    // Check for session cookie
    const sessionCookie = req.cookies.get('admin_session');

    if (!sessionCookie?.value) {
      // Redirect to login page
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Session exists - allow access
    return NextResponse.next();
  }

  // Protect admin API routes (except auth endpoints)
  if (pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/auth')) {
    // Check for session cookie first
    const sessionCookie = req.cookies.get('admin_session');

    if (sessionCookie?.value) {
      return NextResponse.next();
    }

    // Fall back to Basic Auth for API compatibility (e.g., external tools)
    const basicAuth = req.headers.get('authorization');

    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1];
      const [user, password] = Buffer.from(authValue, 'base64').toString().split(':');

      const ADMIN_USER = process.env.ADMIN_USER || 'admin';
      const ADMIN_PASS = process.env.ADMIN_PASS || 'adminpass';

      if (user === ADMIN_USER && password === ADMIN_PASS) {
        return NextResponse.next();
      }
    }

    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Allow all other requests
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/portal/ticket/:path*', '/portal/tickets/:path*'],
};
