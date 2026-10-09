import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, checkBasicAuth, verifySessionToken } from '@/lib/admin-auth';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Alte Kategorie-Adressen (/kategorie/<uuid>) → 301 auf den Slug (Route-Handler).
  const legacyCat = pathname.match(/^\/kategorie\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i);
  if (legacyCat) return NextResponse.rewrite(new URL(`/legacy/kategorie/${legacyCat[1]}`, req.url));

  // Protect portal routes (except login page and auth API)
  if (pathname.startsWith('/portal/ticket') || pathname.startsWith('/portal/tickets')) {
    const portalSession = req.cookies.get('portal_session');

    if (!portalSession?.value) {
      // Redirect to portal login
      return NextResponse.redirect(new URL('/portal', req.url));
    }
  }

  // Admin-Seiten: signierte Session erforderlich (außer Login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const session = await verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value);
    if (!session) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      const res = NextResponse.redirect(loginUrl);
      if (req.cookies.get(ADMIN_COOKIE)) res.cookies.delete(ADMIN_COOKIE); // altes/ungültiges Cookie entfernen
      return res;
    }
    return NextResponse.next();
  }

  // Admin-API (außer Login/Logout): Session oder Basic Auth. Jede Route prüft zusätzlich per requireAdmin().
  if (pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/auth')) {
    const session = await verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value);
    if (session || checkBasicAuth(req.headers.get('authorization'))) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Allow all other requests
  return NextResponse.next();
}

export const config = {
  matcher: ['/kategorie/:id','/admin/:path*', '/api/admin/:path*', '/portal/ticket/:path*', '/portal/tickets/:path*'],
};
