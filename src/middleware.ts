import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    const basicAuth = req.headers.get('authorization');

    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1];
      const [user, password] = Buffer.from(authValue, 'base64').toString().split(':');

      // Use environment variables for username and password
      const ADMIN_USER = process.env.ADMIN_USER || 'admin';
      const ADMIN_PASS = process.env.ADMIN_PASS || 'adminpass';

      if (user === ADMIN_USER && password === ADMIN_PASS) {
        return NextResponse.next();
      }
    }

    // If authentication fails or is not provided, prompt for credentials
    return new NextResponse('Authentication Required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"',
      },
    });
  }

  // Allow all other requests
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'], // Apply middleware to all routes under /admin
};
